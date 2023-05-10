import { Env } from "./config";
import { getModules, getModulesCount } from "./d1";
import { Context } from "hono";

export async function handle(
  context: Context<{
    Bindings: Env;
  }>
) {
  const { page, limit } = context.req.query();
  let pageNum = Number(page) || 1;
  let limitNum = Number(limit) || 10;

  if (pageNum < 1) pageNum = 1;
  if (limitNum < 1) limitNum = 10;
  if (limitNum > 20) limitNum = 20;

  const modules = await getModules(
    context.env.REGISTRY_SQL,
    "std",
    pageNum,
    limitNum
  );
  const total = await getModulesCount(context.env.REGISTRY_SQL, "std");

  return context.json({
    items: modules,
    total,
    current_page: pageNum,
  });
}
