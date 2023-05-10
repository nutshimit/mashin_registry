import { Context } from "hono";
import type {
  ClassDef,
  DocNode,
  DocNodeClass,
  DocNodeInterface,
  JsDocTagDoc,
  TsTypeDef,
} from "./doc.d";
import {
  ApiModuleData,
  DocPageModuleItem,
  DocPageParam,
  DocPageProviderItem,
  DocPageResourceItem,
  FileExample,
} from "./types";
import { Env } from "./config";
import { getModule, getModuleVersion } from "./d1";
import { parseSemVer } from "semver-parser";
import { docHandler } from "../app/client";

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
      return docHandler(module, moduleVersion, context);
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

function buildProvider(
  provider: DocNodeClass,
  config: DocNodeInterface | undefined,
  module: ApiModuleData
): DocPageProviderItem {
  const moduleToSnake = module.name
    .replace(/\.?([A-Z])/g, function (_, y) {
      return "_" + y.toLowerCase();
    })
    .replace(/^_/, "");

  const params =
    config?.interfaceDef.properties.map((prop) => {
      if (prop.location) {
        // @ts-expect-error
        delete prop.location;
      }
      const js_doc = prop.jsDoc || null;
      const ts_type = prop.tsType || null;
      const optional = isOptional(ts_type);

      delete prop.jsDoc;
      delete prop.tsType;
      // @ts-expect-error
      delete prop.typeParams;
      // @ts-expect-error
      delete prop.computed;
      // @ts-expect-error
      delete prop.params;

      return {
        ...prop,
        js_doc,
        ts_type: flattenTypeIfNeeded(ts_type),
        optional,
      };
    }) || [];

  let finalExample: string | null = null;
  const examples = buildExample(params, 2);
  if (examples) {
    finalExample = `new ${module.name}.Provider("${moduleToSnake}_name", {
${examples}
});`;
  }

  return {
    kind: "provider",
    js_doc: provider.jsDoc,
    params,
    example: finalExample,
  };
}

function isOptional(typeDef: TsTypeDef | null) {
  return (
    typeDef?.kind === "union" &&
    typeDef?.union.some((t) => t.repr === "undefined" || t.repr === "null")
  );
}

function flattenTypeIfNeeded(typeDef: TsTypeDef | null) {
  if (
    typeDef?.kind === "union" &&
    typeDef?.union.some((t) => t.repr === "undefined") &&
    typeDef?.union.some((t) => t.repr === "null") &&
    typeDef?.union.length === 3
  ) {
    return (
      typeDef.union.find((t) => t.repr !== "undefined" && t.repr !== "null") ||
      null
    );
  }

  return typeDef;
}

function buildExample(params: DocPageParam[], indent: number) {
  const space = " ".repeat(indent);
  const filteredParams = params.filter((f) => {
    return f.js_doc?.tags?.find((tag) => tag.kind === "example");
  });
  const paramsSize = filteredParams.length;
  const maybeParamsExample = filteredParams
    .flatMap((f, index) => {
      return f.js_doc!.tags!.map((tag) => {
        const isLast = index === paramsSize - 1;
        const maybeLineBreak = isLast ? "" : "\n";
        const foundTag = tag as JsDocTagDoc;
        if (foundTag.doc) {
          return `${space}${f.name}: ${foundTag.doc},${maybeLineBreak}`;
        }
      });
    })
    .filter((p) => !!p) as string[];

  if (maybeParamsExample && maybeParamsExample.length > 0) {
    return maybeParamsExample.join("");
  }

  return null;
}

function buildResources(
  resources: DocNodeClass[],
  nodes: DocNode[],
  module: ApiModuleData
): DocPageResourceItem[] {
  return resources.map((resource) => {
    const maybeOutput = extractResourceOutput(resource, nodes);
    const maybeConfig = extractResourceConfig(resource, nodes);
    const resourceToSnake = resource.name
      .replace(/\.?([A-Z])/g, function (_, y) {
        return "_" + y.toLowerCase();
      })
      .replace(/^_/, "");

    const params: DocPageParam[] =
      maybeConfig?.interfaceDef.properties.map((prop) => {
        if (prop.location) {
          // @ts-expect-error
          delete prop.location;
        }
        const js_doc = prop.jsDoc || null;
        const ts_type = prop.tsType || null;
        const optional = isOptional(ts_type);

        delete prop.jsDoc;
        delete prop.tsType;
        // @ts-expect-error
        delete prop.typeParams;
        // @ts-expect-error
        delete prop.computed;
        // @ts-expect-error
        delete prop.params;

        return {
          ...prop,
          js_doc,
          ts_type: flattenTypeIfNeeded(ts_type),
          optional,
        };
      }) || [];

    const output =
      maybeOutput?.interfaceDef.properties.map((prop) => {
        if (prop.location) {
          // @ts-expect-error
          delete prop.location;
        }
        const js_doc = prop.jsDoc || null;
        const ts_type = prop.tsType || null;

        delete prop.jsDoc;
        delete prop.tsType;
        // @ts-expect-error
        delete prop.typeParams;
        // @ts-expect-error
        delete prop.computed;
        // @ts-expect-error
        delete prop.params;
        // @ts-expect-error
        delete prop.optional;

        return {
          ...prop,
          js_doc,
          ts_type: flattenTypeIfNeeded(ts_type),
        };
      }) || [];

    let finalExample: string | null = null;
    const examples = buildExample(params, 4);
    if (examples) {
      finalExample = `new ${module.name}.${resource.name}(
  "${resourceToSnake}_name",
  {
${examples}
  },
  { provider }
);`;
    }

    return {
      kind: "resource",
      name: resource.name,
      js_doc: resource.jsDoc,
      example: finalExample,
      params,
      output,
    };
  });
}

function filterResources(nodes: DocNode[]): DocNodeClass[] | undefined {
  // @ts-ignore
  return nodes.filter((node) => node.classDef?.extends === "MashinResource");
}
function findProvider(nodes: DocNode[]): DocNodeClass | undefined {
  // @ts-ignore
  return nodes.find((node) => node.classDef?.extends === "MashinProvider");
}

function extractProviderConfig(
  node: DocNodeClass,
  nodes: DocNode[]
): DocNodeInterface | undefined {
  // @ts-ignore
  return nodes.find(
    (foundNode) =>
      foundNode.kind === "interface" &&
      foundNode.name === node.classDef.constructors[0].params[1].tsType?.repr
  );
}

function extractResourceConfig(
  node: DocNodeClass,
  nodes: DocNode[]
): DocNodeInterface | undefined {
  // @ts-ignore
  return nodes.find(
    (foundNode) =>
      foundNode.kind === "interface" &&
      foundNode.name === node.classDef.constructors[0].params[1].tsType?.repr
  );
}

function extractResourceOutput(
  node: DocNodeClass,
  nodes: DocNode[]
): DocNodeInterface | undefined {
  // @ts-ignore
  return nodes.find(
    (foundNode) =>
      foundNode.kind === "interface" &&
      foundNode.name === node.classDef.superTypeParams[0].repr
  );
}

export function generateDocs(
  docNodes: DocNode[],
  module: ApiModuleData
): DocPageModuleItem[] {
  const provider = findProvider(docNodes);
  const resources = filterResources(docNodes);

  if (!provider || resources?.length === 0) {
    return [];
  }

  const config = extractProviderConfig(provider, docNodes);

  const finalProvider = buildProvider(provider, config, module);

  const finalResources = resources
    ? buildResources(resources, docNodes, module)
    : [];

  return [finalProvider, ...finalResources];
}
