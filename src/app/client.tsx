import { Context, HonoRequest } from "hono";
import { CodePage } from "./page/code";
import { ModulePage } from "./page/module";
import { DocPage } from "./page/doc";
import renderToString from "preact-render-to-string";
import { Env } from "../workers/config";
import { VNode, hydrate } from "preact";
import { define } from "preactement";
import { ApiModuleData, ApiModuleVersion } from "../workers/types";

const Code = define("code", () => CodePage);
const Module = define("module", () => ModulePage);
const Doc = define("doc", () => DocPage);

export type Page = "code" | "module" | "doc";

let isCold = true;

if (typeof document !== "undefined") {
  if (document.getElementById("root-module")) {
    hydrate(Module, document.getElementById("root-module")!);
  } else if (document.getElementById("root-code")) {
    hydrate(Code, document.getElementById("root-code")!);
  } else if (document.getElementById("root-doc")) {
    hydrate(Doc, document.getElementById("root-doc")!);
  }
}

export function codeHandler(
  code: string,
  module: ApiModuleData,
  moduleVersion: ApiModuleVersion,
  context: Context<{
    Bindings: Env;
  }>
) {
  const { path } = context.req.param();
  return frontendHandler(
    "code",
    <Code
      isCold={true}
      rawCode={code}
      module={module}
      moduleVersion={moduleVersion}
      path={path}
    />,
    context
  );
}

export function moduleHandler(
  module: ApiModuleData,
  moduleVersion: ApiModuleVersion,
  context: Context<{
    Bindings: Env;
  }>
) {
  return frontendHandler(
    "module",
    <Module isCold={true} module={module} moduleVersion={moduleVersion} />,
    context
  );
}

export function docHandler(
  module: ApiModuleData,
  moduleVersion: ApiModuleVersion,
  context: Context<{
    Bindings: Env;
  }>
) {
  return frontendHandler(
    "doc",
    <Doc isCold={true} module={module} moduleVersion={moduleVersion} />,
    context
  );
}

function frontendHandler(
  pageName: Page,
  node: VNode<{}>,
  context: Context<{
    Bindings: Env;
  }>
) {
  const wasCold = isCold;
  let html: string;
  isCold = false;
  try {
    html = renderToString(node);
  } catch (err: any) {
    console.error("Render error:", err.stack);
    return context.newResponse(
      `<!doctype html>
      <h1>Internal application error</h1>
      <p>The app failed to render.</p>`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }
    );
  }

  return context.newResponse(
    `<!doctype html>
      <html lang="en" class="h-full bg-gray-100">
      <head>
        <title></title> 
        <script type="module" src="/assets/client.js"></script>
        <script src="/assets/highlight.min.js"></script>
        <link rel="stylesheet" href="/assets/mashin.css" />
        <link rel="stylesheet" href="/assets/github.min.css" />
      </head>
      <body class="h-full antialiased">
         <div id="root"><div id="root-${pageName}">` +
      html +
      `</div></div>
      </body>
    </html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "x-is-cold": wasCold ? "true" : "false",
      },
    }
  );
}
