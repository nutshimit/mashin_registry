import { Context, HonoRequest } from "hono";
import { CodePage } from "./page/code";
import { ModulePage } from "./page/module";
import { DocPage } from "./page/doc";
import renderToString from "preact-render-to-string";
import { Env } from "../workers/config";
import { VNode, hydrate } from "preact";
import { define } from "preactement";
import { ApiModuleData, ApiModuleVersion } from "../workers/types";
import { IndexPage } from "./page/index";

const Code = define("code", () => CodePage);
const Module = define("module", () => ModulePage);
const Doc = define("doc", () => DocPage);
const Index = define("index", () => IndexPage);

export type Page = "code" | "module" | "doc" | "index";

let isCold = true;

if (typeof document !== "undefined") {
  if (document.getElementById("root-module")) {
    hydrate(Module, document.getElementById("root-module")!);
  } else if (document.getElementById("root-code")) {
    hydrate(Code, document.getElementById("root-code")!);
  } else if (document.getElementById("root-doc")) {
    hydrate(Doc, document.getElementById("root-doc")!);
  } else if (document.getElementById("root-index")) {
    hydrate(Index, document.getElementById("root-index")!);
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
      isCold={isCold}
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
    <Module isCold={isCold} module={module} moduleVersion={moduleVersion} />,
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
    <Doc isCold={isCold} module={module} moduleVersion={moduleVersion} />,
    context
  );
}

export function indexHandler(
  context: Context<{
    Bindings: Env;
  }>
) {
  return frontendHandler(
    "index",
    <Index
      appId={context.env.ALGOLIA_APP_ID}
      apiKey={context.env.ALGOLIA_API_KEY}
      indexName={context.env.ALGOLIA_INDEX_NAME}
      isCold={isCold}
    />,
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
      <html lang="en" class="h-full ${
        pageName === "index" ? "bg-white" : "bg-slate-100"
      }">
      <head>
        <title>mashin.run: Mashin Provider Registry</title>
        <meta name="description" content="mashin.run is the provider registry for mashin">
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
