import { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";

const STD_OWNER = "nutshimit";
type GithubRelease =
  Endpoints["GET /repos/{owner}/{repo}/releases/{release_id}"]["response"]["data"];

export interface Env {
  REGISTRY: KVNamespace;
  GITHUB_TOKEN: string;
}

type ReleaseInfo = {
  owner: string;
  repo: string;
  module: Module;
  version: string;
  url: string;
};

type Module = {
  type: "x" | "std";
  name: string;
};

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    try {
      const { pathname } = new URL(request.url);

      if (request.method === "GET") {
        return await handleGet(pathname, env);
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
            if (foundRepo && foundRepo === "ACTIVE" && action === "published") {
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
  console.log("ADD MODULE", module.type);
  switch (module.type) {
    case "std":
      await addStdRelease(env, release, module, repository);
      break;
    case "x":
      await addXRelease(env, release, module, repository);
      break;
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
    return;
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
}

async function handleGet(pathname: string, env: Env) {
  if (pathname === "/favicon.ico") {
    return new Response(null, { status: 200 });
  }

  const regexPattern =
    /^\/([a-zA-Z0-9-_]+)@((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)+(?:\/(.*)\.ts)?$/;

  const match = pathname.match(regexPattern);

  if (!match) {
    return Response.redirect(
      "https://github.com/nutshimit/mashin_registry",
      307
    );
  }

  const currentModule = moduleFromName(match[1]);
  const version = match[2];
  const module = await env.REGISTRY.get(`${currentModule.name}@${version}`);

  if (module) {
    const decodedModule = JSON.parse(module) as ReleaseInfo;
    let moduleContent;
    if (decodedModule.module.type === "std") {
      const path = `${match[8]}.ts`;
      const url = `${decodedModule.url}/${path}`;
      moduleContent = await fetch(url);
    } else {
      moduleContent = await fetch(decodedModule.url);
    }
    const rawContent = await moduleContent.text();
    return new Response(rawContent, {
      status: 200,
      headers: {
        "Content-Type": "application/typescript; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
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

    release.data.forEach(async (release) => {
      await addRelease(env, release, module, repository);
    });

    await env.REGISTRY.put(module.name, "ACTIVE");
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
