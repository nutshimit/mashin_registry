import {
  OpenAPIRoute,
  Path,
  Query,
  Str,
} from "@cloudflare/itty-router-openapi";
import { Env } from "./config";
import {
  WebhookPayloadRelease,
  type WebhookPayloadPing,
  WebhookPayloadCreate,
  PayloadReleaseAsset,
} from "./webhooks.d";
import {
  ApiModuleData,
  Build,
  ModuleMetaVersionsJson,
  ModuleType,
} from "./types";
import {
  createBuild,
  getModule,
  getModuleVersion,
  isForbidden,
  upsertModule,
} from "./d1";
import { v4 as uuidv4 } from "uuid";
import { parseSemVer } from "semver-parser";
import { Context } from "hono";

export async function handle(
  context: Context<{
    Bindings: Env;
  }>
) {
  const { module: moduleName } = context.req.param();

  let body = undefined;
  try {
    body = await context.req.json();
  } catch (error) {
    console.log(error);
  }

  if (!body) {
    return context.json(
      {
        success: false,
        error: "no body provided",
      },
      {
        status: 400,
      }
    );
  }

  const ghEvent = context.req.headers.get("x-github-event");
  const { searchParams } = new URL(context.req.url);

  switch (ghEvent) {
    case "ping":
      return pingEvent(
        context.env,
        moduleName,
        body as WebhookPayloadPing,
        searchParams
      );
    case "release":
      return releaseEvent(
        context.env,
        moduleName,
        body as WebhookPayloadRelease,
        searchParams
      );
    default:
      return new Response(
        JSON.stringify({
          success: false,
          info: "not a ping, or create event",
        }),
        {
          status: 200,
        }
      );
  }
}

export async function releaseEvent(
  env: Env,
  module: string,
  body: WebhookPayloadRelease,
  searchParams: URLSearchParams
): Promise<Response> {
  if (body.action !== "released") {
    return new Response(
      JSON.stringify({
        success: false,
        info: "not a `released` action",
      }),
      {
        status: 200,
      }
    );
  }

  const [owner, repo] = body.repository.full_name.split("/");
  const versionPrefix = decodeURIComponent(
    searchParams.get("version_prefix") ?? ""
  );
  const subdir = decodeURIComponent(searchParams.get("subdir") ?? "") || null;
  const type = (decodeURIComponent(searchParams.get("type") ?? "") ||
    null) as ModuleType | null;

  body.release.assets;

  return initiateBuild(env, {
    module,
    repoId: body.repository.id,
    owner,
    repo,
    sender: body.sender.login,
    ref: body.release.tag_name,
    description: body.repository.description ?? "",
    starCount: body.repository.stargazers_count,
    versionPrefix,
    subdir,
    type,
    assets: body.release.assets,
  });
}

async function initiateBuild(
  env: Env,
  {
    module,
    repoId,
    owner,
    repo,
    sender,
    ref,
    description,
    starCount,
    versionPrefix,
    subdir,
    type,
    assets,
  }: {
    module: string;
    repoId: number;
    owner: string;
    repo: string;
    sender: string;
    ref: string;
    description: string;
    starCount: number;
    versionPrefix: string;
    subdir: string | null;
    type: ModuleType | null;
    assets: PayloadReleaseAsset[];
  }
): Promise<Response> {
  if (!ref.startsWith(versionPrefix)) {
    return new Response(
      JSON.stringify({
        success: false,
        info: "ignoring event as the version does not match the version prefix",
      }),
      {
        status: 200,
      }
    );
  }

  const version = ref.substring(versionPrefix.length);

  const res = await checkAndUpdateModule(
    env,
    module,
    owner,
    sender,
    repoId,
    subdir,
    type,
    repo,
    description,
    starCount
  );

  if (res instanceof Response) {
    return res;
  }

  const invalidVersion = await checkVersion(env, module, version);
  if (invalidVersion) return invalidVersion;

  let trimmedAssets: Response | PayloadReleaseAsset[] = assets;
  if (type !== "std") {
    trimmedAssets = checkReleaseAssets(assets);
    if (trimmedAssets instanceof Response) {
      return trimmedAssets;
    }
  }

  const id = uuidv4();
  const newBuild: Build = {
    id,
    module,
    version,
    assets: trimmedAssets,
    status: "queued",
    created_at: new Date(),
  };

  await createBuild(env.REGISTRY_SQL, newBuild);
  await env.REGISTRY_QUEUE.send(newBuild);

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        module,
        version,
        repository: `${owner}/${repo}`,
        build_id: id,
      },
    }),
    {
      status: 200,
    }
  );
}

export async function pingEvent(
  env: Env,
  module: string,
  body: WebhookPayloadPing,
  searchParams: URLSearchParams
): Promise<Response> {
  const [owner, repo] = body.repository.full_name.split("/");
  const repoId = body.repository.id;
  const description = body.repository.description ?? "";
  const starCount = body.repository.stargazers_count;
  const sender = body.sender.login;
  const subdir = decodeURIComponent(searchParams.get("subdir") ?? "") || null;
  const type = (decodeURIComponent(searchParams.get("type") ?? "") ||
    null) as ModuleType | null;

  const res = await checkAndUpdateModule(
    env,
    module,
    owner,
    sender,
    repoId,
    subdir,
    type,
    repo,
    description,
    starCount
  );

  if (res instanceof Response) {
    return res;
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        module,
        repository: `${owner}/${repo}`,
      },
    }),
    {
      status: 200,
    }
  );
}

async function checkModuleInfo(
  env: Env,
  entry: ApiModuleData | null,
  module: string,
  owner: string,
  sender: string,
  repoId: number,
  subdir: string | null
): Promise<Response | undefined> {
  const checks =
    checkMatchesRepo(entry, repoId) ?? (await checkName(env, entry, module));

  return checks;
}

const VALID_NAME = /^[a-z0-9_]{3,40}$/;

async function checkName(
  env: Env,
  entry: ApiModuleData | null,
  module: string
): Promise<Response | undefined> {
  if (!entry) {
    if (!VALID_NAME.test(module)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "module name is not valid",
        }),
        {
          status: 400,
        }
      );
    }

    if (await isForbidden(env.REGISTRY_SQL, module)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "found forbidden word in module name",
        }),
        {
          status: 400,
        }
      );
    }
  }
  return;
}

function checkMatchesRepo(
  entry: ApiModuleData | null,
  repoId: number
): Response | undefined {
  if (entry && !(entry.type === "provider" && entry.repo_id === repoId)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "module name is registered to a different repository",
      }),
      {
        status: 409,
      }
    );
  }
  return;
}

async function checkAndUpdateModule(
  env: Env,
  module: string,
  owner: string,
  sender: string,
  repoId: number,
  subdir: string | null,
  type: ModuleType | null,
  repo: string,
  description: string,
  starCount: number
): Promise<Response | undefined> {
  const entry = await getModule(env.REGISTRY_SQL, module);
  if (type !== "std") {
    const resp = await checkModuleInfo(
      env,
      entry,
      module,
      owner,
      sender,
      repoId,
      subdir
    );

    if (resp) return resp;
  }

  const newModule: ApiModuleData = {
    ...(entry ?? {
      name: module,
      type: type ?? "provider",
      created_at: new Date(),
      is_unlisted: false,
      latest_version: null,
      versions: [],
    }),
    repo_id: repoId,
    owner,
    repo,
    description,
    star_count: starCount,
  };

  await upsertModule(env.REGISTRY_SQL, newModule);
}

function checkReleaseAssets(
  assets: WebhookPayloadRelease["release"]["assets"]
): Response | WebhookPayloadRelease["release"]["assets"] {
  const isValidRelease = assets.find(
    (asset) =>
      asset.name.includes(".so") ||
      asset.name.includes(".dll") ||
      asset.name.includes(".dylib")
  );

  if (!isValidRelease) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "no `.so`, `dylib` or `.dll` files found in release",
      }),
      {
        status: 400,
      }
    );
  }

  return assets.filter(
    (asset) =>
      asset.name.includes(".so") ||
      asset.name.includes(".dll") ||
      asset.name.includes(".dylib") ||
      asset.name.includes(".ts") ||
      asset.name.includes(".json")
  );
}

async function checkVersion(
  env: Env,
  module: string,
  version: string
): Promise<Response | undefined> {
  // Check that version doesn't already exist
  const versionInfo = await getModuleVersion(
    env.REGISTRY_SQL,
    module,
    parseSemVer(version)
  );
  if (versionInfo) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "version already exists",
      }),
      {
        status: 400,
      }
    );
  }

  return;
}
