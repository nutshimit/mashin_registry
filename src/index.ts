import { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";

type GithubRelease =
  Endpoints["GET /repos/{owner}/{repo}/releases/{release_id}"]["response"]["data"];

export interface Env {
  REGISTRY: KVNamespace;
  GITHUB_TOKEN: string;
}

type ReleaseInfo = {
  owner: string;
  repo: string;
  version: string;
  entrypoint: string;
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
        if (pathname === "/favicon.ico") {
          return new Response(null, { status: 200 });
        }

        const regexPattern =
          /^\/([a-zA-Z0-9-_]+)@((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/;

        const match = pathname.match(regexPattern);

        if (!match) {
          return new Response("Invalid path", { status: 400 });
        }

        const moduleName = match[1];
        const version = match[2];

        const module = await env.REGISTRY.get(`${moduleName}@${version}`);

        if (module) {
          const decodedModule = JSON.parse(module) as ReleaseInfo;
          let moduleContent = await fetch(decodedModule.entrypoint);
          let rawContent = await moduleContent.text();

          return new Response(rawContent, {
            status: 200,
            headers: {
              "Content-Type": "application/javascript; charset=utf-8",
              "Cache-Control": "public, max-age=86400",
            },
          });
        } else {
          return new Response("Invalid module", { status: 404 });
        }
      } else if (
        pathname.startsWith("/webhook/github") &&
        request.method === "POST"
      ) {
        const event = request.headers.get("X-GitHub-Event");
        // FIXME: validate moduleName
        const moduleName = pathname.replace("/webhook/github/", "");

        const contentType = request.headers.get("content-type");
        if (
          event != null &&
          contentType != null &&
          contentType.includes("application/json")
        ) {
          const json: any = await request.json();

          if (event === "ping") {
            // check if its already exist
            let foundRepo = await env.REGISTRY.get(moduleName);
            if (!foundRepo) {
              const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
              // extract all past releases
              const release = await octokit.request(
                "GET /repos/{owner}/{repo}/releases",
                {
                  owner: json.repository.owner.login,
                  repo: json.repository.name,
                }
              );

              release.data.forEach(async (release) => {
                await addRelease(
                  env,
                  release,
                  moduleName,
                  json.repository.owner.login,
                  json.repository.name
                );
              });

              await env.REGISTRY.put(moduleName, "ACTIVE");
              return new Response("Webhook init", { status: 200 });
            } else {
              return new Response("Name is already claimed", { status: 500 });
            }
          } else if (event === "release") {
            const foundRepo = await env.REGISTRY.get(moduleName);
            const action = json.action;
            if (foundRepo && foundRepo === "ACTIVE" && action === "published") {
              await addRelease(
                env,
                json.release,
                moduleName,
                json.repository.owner.login,
                json.repository.name
              );
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
  moduleName: string,
  repoOwner: string,
  repoName: string
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
  let entrypoint = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${release.tag_name}/mod.ts`;
  if (foundModule) {
    entrypoint = foundModule.browser_download_url;
  }

  let version = release.tag_name;
  if (version.startsWith("v")) {
    version = version.slice(1);
  }

  await env.REGISTRY.put(
    `${moduleName}@${version}`,
    JSON.stringify({
      owner: repoOwner,
      repo: repoName,
      version,
      entrypoint,
    })
  );
}
