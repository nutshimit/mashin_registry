import { Context } from "hono";
import { Env } from "./config";
import { getModule, getModuleVersion } from "./d1";
import { parseSemVer } from "semver-parser";
import { moduleHandler } from "../app/client";

export async function handle(
  context: Context<{
    Bindings: Env;
  }>
) {
  const { moduleName, path } = context.req.param();
  const [extractedName, version] = moduleName.split("@");
  const module = await getModule(context.env.REGISTRY_SQL, extractedName);
  if (module) {
    const moduleVersion = await getModuleVersion(
      context.env.REGISTRY_SQL,
      extractedName,
      parseSemVer(version)
    );

    if (moduleVersion) {
      return moduleHandler(module, moduleVersion, context);
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
