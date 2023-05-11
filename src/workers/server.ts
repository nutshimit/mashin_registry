import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";

import * as webhooks from "./webhooks";
import { Env } from "./config";
import { Build } from "./types";
import { processBuild } from "./process";
import * as cdn from "./cdn";
import * as libs from "./libs";
import * as providers from "./providers";
import * as provider from "./provider";
import * as lib from "./lib";
import * as module from "./module";
import * as doc from "./doc";
import * as home from "./home";

const app = new Hono<{ Bindings: Env }>();

app.get("/assets/*", serveStatic({ root: "./" }));

// Libs (like `std`) and later we could add another type of module easilly
app.get("/api/v1/libs", libs.handle);
app.get("/api/v1/lib/:module", lib.get);
app.get("/api/v1/lib/:module/:version", lib.getVersion);

app.get("/api/v1/providers", providers.handle);
app.get("/api/v1/provider/:module", provider.get);
app.get("/api/v1/provider/:module/:version", provider.getVersion);
app.get("/api/v1/provider/:module/:version/doc", provider.getDoc);

app.post("/api/v1/webhook/github/:module", webhooks.handle);

// module@0.0.0/doc
app.get("/:moduleName{[a-zA-Z0-9_]+@[0-9]+.[0-9]+.[0-9]+}/doc", doc.handle);
// module@latest/doc
app.get("/:moduleName{[a-zA-Z0-9_]+@latest}/doc", doc.redirectLatest);
// module
app.get("/:moduleName{[a-zA-Z0-9_]+}", module.redirectLatest);
// module@latest
app.get("/:moduleName{[a-zA-Z0-9_]+@latest}", module.redirectLatest);
// module@0.0.0
app.get("/:moduleName{[a-zA-Z0-9_]+@[0-9]+.[0-9]+.[0-9]+}", module.handle);
// module@0.0.0/{any-path/?}
app.get(
  "/:moduleName{[a-zA-Z0-9_]+@[0-9]+.[0-9]+.[0-9]+}/:path{[^]*}",
  cdn.handle
);

app.get("/", home.handle);

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<Build>, env: Env) {
    for await (const iterator of batch.messages) {
      await processBuild(env, iterator.body);
    }
  },
};

/*

// Providers

// Github webhook handling

// Raw files (of libs and providers)

router.all(
  "*",
  () =>
    new Response(
      JSON.stringify({
        success: false,
        error: "page not found",
      }),
      {
        status: 404,
      }
    )
);

export default {
  fetch: router.handle,
  async queue(batch: MessageBatch<Build>, env: Env) {
    for await (const iterator of batch.messages) {
      await processBuild(env, iterator.body);
    }
  },
};
*/
