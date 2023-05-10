import { Env } from "./config";
import { getModule, getModuleVersion } from "./d1";
import { parseSemVer } from "semver-parser";
import { Context } from "hono";

export async function get(
  context: Context<{
    Bindings: Env;
  }>
) {
  const { module: moduleName } = context.req.param();
  const module = await getModule(context.env.REGISTRY_SQL, moduleName);

  if (module?.type !== "std") {
    return context.json(
      {
        success: false,
        error: "invalid module",
      },
      {
        status: 400,
      }
    );
  }

  return context.json(module);
}

export async function getVersion(
  context: Context<{
    Bindings: Env;
  }>
) {
  const { module: moduleName, version } = context.req.param();
  const module = await getModule(context.env.REGISTRY_SQL, moduleName);

  if (module?.type !== "std") {
    return context.json(
      {
        success: false,
        error: "invalid module",
      },
      {
        status: 400,
      }
    );
  }

  const moduleVersion = await getModuleVersion(
    context.env.REGISTRY_SQL,
    moduleName,
    parseSemVer(version)
  );

  delete moduleVersion?.doc;
  return context.json(moduleVersion);
}
