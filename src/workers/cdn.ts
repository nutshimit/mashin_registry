import { render } from "preact-render-to-string";
import { Env } from "./config";
import { getModule, getModuleVersion } from "./d1";
import { Context } from "hono";
import { codeHandler } from "../app/client";
import { parseSemVer } from "semver-parser";

export async function handle(
  context: Context<{
    Bindings: Env;
  }>
) {
  const { moduleName, path } = context.req.param();
  const [extractedName, version] = moduleName.split("@");
  const isHTML =
    context.req.headers.get("accept")?.includes("text/html") ||
    (context.req.headers.get("accept") === "*/*" &&
      context.req.headers.get("user-agent")?.includes("bot"));

  const module = await getModule(context.env.REGISTRY_SQL, extractedName);
  if (module) {
    const fileContent = await context.env.MASHIN_CDN.get(
      `${module.owner}/${module.repo}-${version}/${path}`
    );

    if (fileContent) {
      const rawText = await fileContent.text();

      if (isHTML) {
        const moduleVersion = await getModuleVersion(
          context.env.REGISTRY_SQL,
          extractedName,
          parseSemVer(version)
        );

        // FIXME: not sure if its really needed
        if (moduleVersion) {
          return codeHandler(rawText, module, moduleVersion, context);
        }
      } else {
        return context.newResponse(rawText, {
          headers: {
            "Content-Type":
              fileContent.httpMetadata?.contentType || "text/plain",
          },
        });
      }
    }
  }

  return context.json(
    {
      success: false,
      error: "file not found",
    },
    {
      status: 404,
    }
  );
}
