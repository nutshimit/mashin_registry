import { render } from "preact-render-to-string";
import { Env } from "./config";
import { getModule, getModuleVersion } from "./d1";
import { Context } from "hono";
import { codeHandler, indexHandler } from "../app/client";
import { parseSemVer } from "semver-parser";

export async function handle(
  context: Context<{
    Bindings: Env;
  }>
) {
  return indexHandler(context);
}
