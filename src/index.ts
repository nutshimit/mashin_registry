import { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";
import {
  getAssetFromKV,
  mapRequestToAsset,
  serveSinglePageApp,
} from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const assetManifest = JSON.parse(manifestJSON);

const STD_OWNER = "nutshimit";
type GithubRelease =
  Endpoints["GET /repos/{owner}/{repo}/releases/{release_id}"]["response"]["data"];

export interface Env {
  REGISTRY: KVNamespace;
  GITHUB_TOKEN: string;
  __STATIC_CONTENT: any;
}

type ReleaseInfo = {
  owner: string;
  repo: string;
  module: Module;
  version: string;
  url: string;
};

type ModuleRelease = {
  latest: string;
  availables: string[];
};

type Module = {
  type: "x" | "std";
  name: string;
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);
      const isMashinAgent =
        request.headers.get("user-agent")?.includes("mashin") ||
        request.headers.get("accept")?.includes("typescript") ||
        false;

      if (request.method === "GET") {
        return await handleGet(pathname, env, request, ctx, isMashinAgent);
      } else if (
        pathname.startsWith("/webhook/github") &&
        request.method === "POST"
      ) {
        const event = request.headers.get("X-GitHub-Event");
        const currentModule = moduleFromPath(pathname);
        const contentType = request.headers.get("content-type");
        if (
          event != null &&
          contentType != null &&
          contentType.includes("application/json")
        ) {
          const json: any = await request.json();
          if (event === "ping") {
            if (
              currentModule.type === "std" &&
              json.repository.owner.login !== STD_OWNER
            ) {
              throw new Error("Invalid std owner");
            }

            return await handlePing(env, currentModule, {
              owner: json.repository.owner.login,
              repo: json.repository.name,
            });
          } else if (event === "release") {
            const foundRepo = await env.REGISTRY.get(currentModule.name);
            const action = json.action;
            if (foundRepo && action === "published") {
              if (
                currentModule.type === "std" &&
                json.repository.owner.login !== STD_OWNER
              ) {
                throw new Error("Invalid std owner");
              }

              await addRelease(env, json.release, currentModule, {
                owner: json.repository.owner.login,
                repo: json.repository.name,
              });

              let version = json.release.tag_name;
              if (version.startsWith("v")) {
                version = version.slice(1);
              }
              await addModuleVersion(env, currentModule.name, version);

              return new Response("Webhook release", { status: 200 });
            }
          }
        }

        return new Response("Webhook NO-OP", { status: 200 });
      } else {
        return new Response("Invalid request", { status: 404 });
      }
    } catch (err: any) {
      return new Response(err.stack, { status: 500 });
    }
  },
};

async function addRelease(
  env: Env,
  release: GithubRelease,
  module: Module,
  repository: {
    owner: string;
    repo: string;
  }
) {
  switch (module.type) {
    case "std":
      return await addStdRelease(env, release, module, repository);
    case "x":
      return await addXRelease(env, release, module, repository);
  }
}

async function addModuleVersion(env: Env, module: string, version: string) {
  const foundModule = await env.REGISTRY.get(module);
  if (foundModule) {
    const decodedModule = JSON.parse(foundModule) as ModuleRelease;
    if (decodedModule.latest !== version) {
      decodedModule.latest = version;
      decodedModule.availables.push(version);
      await env.REGISTRY.put(module, JSON.stringify(decodedModule));
    }
  }
}

async function addStdRelease(
  env: Env,
  release: GithubRelease,
  module: Module,
  repository: {
    owner: string;
    repo: string;
  }
) {
  let version = release.tag_name;
  if (version.startsWith("v")) {
    version = version.slice(1);
  }

  let url = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${release.tag_name}`;

  await env.REGISTRY.put(
    `${module.name}@${version}`,
    JSON.stringify({
      version,
      url,
      module,
      ...repository,
    } as ReleaseInfo)
  );

  return true;
}

async function addXRelease(
  env: Env,
  release: GithubRelease,
  module: Module,
  repository: {
    owner: string;
    repo: string;
  }
) {
  const isMashinRelease = release.assets.find(
    (asset) => asset.name.includes(".so") || asset.name.includes(".dll")
  );

  if (!isMashinRelease) {
    return false;
  }

  let foundModule = release.assets.find((asset) => asset.name === "mod.ts");

  // if `mod.ts` isnt in the release,
  // lets fallback to `https://raw.githubusercontent.com/{owner}/{repo}/{tag}/mod.ts`
  let url = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${release.tag_name}/mod.ts`;
  if (foundModule) {
    url = foundModule.browser_download_url;
  }

  let version = release.tag_name;
  if (version.startsWith("v")) {
    version = version.slice(1);
  }

  await env.REGISTRY.put(
    `${module.name}@${version}`,
    JSON.stringify({
      version,
      url,
      module,
      ...repository,
    } as ReleaseInfo)
  );

  return true;
}

async function handleGet(
  pathname: string,
  env: Env,
  request: Request,
  ctx: ExecutionContext,
  isMashinAgent: boolean
): Promise<Response> {
  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 200 });
  }

  const regexPattern =
    /^\/([a-zA-Z0-9-_]+)@((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)+(?:\/(.*)\.ts)?$/;
  let match = pathname.match(regexPattern);

  let maybeModule: string | undefined;
  let maybeVersion: string | undefined;
  let maybePath: string | undefined;

  if (!match) {
    const regexPattern = /^\/([a-zA-Z0-9-_]+)$/;
    const maybeMatch = pathname.match(regexPattern);
    if (maybeMatch) {
      const maybeHaveModule = maybeMatch[1] as string;
      const module = await env.REGISTRY.get(`${maybeHaveModule}`);
      if (module) {
        const decodedModule = JSON.parse(module) as ModuleRelease;
        if (decodedModule.latest) {
          const { hostname } = new URL(request.url);
          return Response.redirect(
            `https://${hostname}/${maybeHaveModule}@${decodedModule.latest}`,
            307
          );
        }
      }
    } else {
      const regexPattern = /^\/([a-zA-Z0-9-_]+).json$/;
      const maybeMatch = pathname.match(regexPattern);
      if (maybeMatch) {
        const module = await env.REGISTRY.get(`${maybeMatch[1]}`);
        if (module) {
          const decodedModule = JSON.parse(module) as ModuleRelease;
          return Response.json(decodedModule);
        }
      }
    }
  } else {
    maybeModule = match[1];
    maybeVersion = match[2];
    maybePath = match[8];
  }

  if (!maybeModule || !maybeVersion) {
    return Response.redirect(
      "https://github.com/nutshimit/mashin_registry",
      307
    );
  }

  const currentModule = moduleFromName(maybeModule);
  const version = maybeVersion;
  const module = await env.REGISTRY.get(`${currentModule.name}@${version}`);

  if (module) {
    if (isMashinAgent) {
      const decodedModule = JSON.parse(module) as ReleaseInfo;
      let sourceUrl;
      if (decodedModule?.module?.type === "std" && maybePath) {
        const path = `${maybePath}.ts`;
        sourceUrl = `${decodedModule.url}/${path}`;
      } else if (decodedModule?.module?.type === "std" && !maybePath) {
        sourceUrl = `${decodedModule.url}/mod.ts`;
      } else {
        sourceUrl = decodedModule.url;
      }
      const moduleContent = await fetch(sourceUrl);
      const rawContent = await moduleContent.text();
      return new Response(rawContent, {
        status: 200,
        headers: {
          "X-Mashin-Github-Url": sourceUrl,
          "X-Mashin-Github-Repository": `https://github.com/${decodedModule.owner}/${decodedModule.repo}`,
          "X-Mashin-Module-Name": `${decodedModule.module.name}`,
          "X-Mashin-Module-Version": `${decodedModule.version}`,
          "Content-Type": "application/typescript; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } else {
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          mapRequestToAsset: (request: any) => {
            // force `code-viewer.html` to be served
            return mapRequestToAsset(
              new Request("https://mashin.run/code-viewer.html", request)
            );
          },
          ASSET_MANIFEST: assetManifest,
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
        }
      );
    }
  }

  return Response.redirect("https://github.com/nutshimit/mashin_registry", 307);
}

async function handlePing(
  env: Env,
  module: Module,
  repository: {
    owner: string;
    repo: string;
  }
) {
  // check if its already exist
  let foundRepo = await env.REGISTRY.get(module.name);
  if (!foundRepo) {
    const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    // extract all past releases
    const release = await octokit.request(
      "GET /repos/{owner}/{repo}/releases",
      repository
    );

    let foundLatest: string | undefined = undefined;
    const availables: string[] = [];
    for (const iterator of release.data) {
      let isValidRelease = await addRelease(env, iterator, module, repository);
      if (isValidRelease && foundLatest === undefined) {
        foundLatest = iterator.tag_name;
        if (foundLatest.startsWith("v")) {
          foundLatest = foundLatest.slice(1);
        }
        availables.push(foundLatest);
      } else if (isValidRelease) {
        let version = iterator.tag_name;
        if (version.startsWith("v")) {
          version = version.slice(1);
        }
        availables.push(version);
      }
    }

    if (foundLatest) {
      await env.REGISTRY.put(
        module.name,
        JSON.stringify({
          latest: foundLatest,
          availables,
        } as ModuleRelease)
      );
    }
  }

  return new Response("Webhook ping", { status: 200 });
}

function moduleFromPath(pathname: string) {
  const name = pathname.replace("/webhook/github/", "");
  return moduleFromName(name);
}

function moduleFromName(name: string): Module {
  if (name.startsWith("std")) {
    return {
      type: "std",
      name,
    };
  }

  // throw new Error("Invalid module");

  return {
    type: "x",
    name,
  };
}
