import { useMemo } from "preact/hooks";
import {
  ApiModuleData,
  ApiModuleVersion,
  DocPageProviderItem,
  DocPageResourceItem,
} from "../../workers/types";
import Nav from "../components/nav";
import { Document } from "../components/icons";
import Module from "../components/module";
import Code from "../components/code";
import Card from "../components/card";

export function DocPage({
  isCold,
  module,
  moduleVersion,
}: {
  isCold: boolean;
  module: ApiModuleData;
  moduleVersion: ApiModuleVersion;
}) {
  const resources = useMemo(() => {
    if (moduleVersion.doc) {
      const provider = moduleVersion.doc.filter((item) => {
        return item.kind === "resource";
      }) as DocPageResourceItem[];

      return provider;
    }
    return [];
  }, [moduleVersion]);

  const provider = useMemo(() => {
    if (moduleVersion.doc) {
      const provider = moduleVersion.doc.find((item) => {
        return item.kind === "provider";
      }) as DocPageProviderItem | undefined;

      return provider;
    }
  }, [moduleVersion]);

  const sampleParams = useMemo(() => {
    if (moduleVersion.doc && provider) {
      let toReturn: Record<string, any> = {};
      provider.params.forEach((element) => {
        switch (element.ts_type?.repr) {
          case "number":
            toReturn[element.name] = 1;
            break;
          case "string":
            toReturn[element.name] = "text";
            break;

          default:
            break;
        }
      });

      return toReturn;
    }
  }, [moduleVersion, provider]);

  return (
    <div className="min-h-full">
      <Nav />
      <Module
        module={module}
        resources={resources}
        moduleVersion={moduleVersion}
      >
        <Card
          header={
            <div className="px-4 py-3 flex items-center">
              <Document className="h-4 w-4 flex-none stroke-sky-500" />
              <h3 className="text-base font-semibold leading-6  lg:ml-2 text-slate-900">
                Example
              </h3>
            </div>
          }
        >
          <div className="p-4 text-xs">
            <Code
              language="typescript"
              code={`// import provider
import * as ${module.name} from "https://mashin.run/${module.name}@${
                moduleVersion.version
              }/${moduleVersion.entrypoint}"

// initialize provider
const provider = new ${module.name}.Provider("uniqueName", ${JSON.stringify(
                sampleParams,
                null,
                "\t"
              )});`}
            />
          </div>
        </Card>
        <Card
          className="mt-4"
          header={
            <div className="px-4 py-3 flex items-center">
              <Document className="h-4 w-4 flex-none stroke-sky-500" />
              <h3 className="text-base font-semibold leading-6  lg:ml-2 text-slate-900">
                Arguments
              </h3>
            </div>
          }
        >
          <div className="p-4 text-xs">
            <dl class="divide-y divide-gray-100">
              {provider?.params.map((param) => {
                return (
                  <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                    <dt class="text-sm font-medium leading-6 text-gray-900">
                      {param.name}
                      {!param.optional && (
                        <span className="text-red-600">*</span>
                      )}
                      <div className="text-xs font-light">
                        {param.ts_type?.repr}
                      </div>
                    </dt>
                    <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                      {param.js_doc?.doc || `No JSdoc found for ${param.name}.`}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </Card>

        {resources.map((resource) => {
          return (
            <>
              <hr className="mt-4" />
              <h1 id={resource.name} class="mt-2 scroll-mt-32 text-xl">
                {resource.name}
              </h1>

              <div className="grid grid-cols-1 items-start gap-x-16 gap-y-10 xl:max-w-none xl:grid-cols-2">
                <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
                  <p className="font-light text-sm">{resource.js_doc?.doc}</p>
                </div>
                <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0 xl:sticky xl:top-24">
                  <Card
                    header={
                      <div className="px-4 py-2 flex items-center">
                        <h3 className="text-sm font-semibold leading-6  lg:ml-2 text-slate-900">
                          Input
                        </h3>
                      </div>
                    }
                  >
                    <div className="p-4 text-xs">
                      <dl class="divide-y divide-gray-100">
                        {resource.params.map((param) => {
                          return (
                            <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                              <dt class="text-sm font-medium leading-6 text-gray-900">
                                {param.name}
                                {!param.optional && (
                                  <span className="text-red-600">*</span>
                                )}
                                <div className="text-xs font-light">
                                  {param.ts_type?.repr}
                                </div>
                              </dt>
                              <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                                {param.js_doc?.doc ||
                                  `No JSdoc found for ${param.name}.`}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  </Card>

                  <Card
                    className="mt-4"
                    header={
                      <div className="px-4 py-2 flex items-center">
                        <h3 className="text-sm font-semibold leading-6  lg:ml-2 text-slate-900">
                          Output
                        </h3>
                      </div>
                    }
                  >
                    <div className="p-4 text-xs">
                      <dl class="divide-y divide-gray-100">
                        {resource.output.map((param) => {
                          return (
                            <div class="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                              <dt class="text-sm font-medium leading-6 text-gray-900">
                                {param.name}
                                <div className="text-xs font-light">
                                  {param.ts_type?.repr}
                                </div>
                              </dt>
                              <dd class="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                                {param.js_doc?.doc ||
                                  `No JSdoc found for ${param.name}.`}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          );
        })}
      </Module>
    </div>
  );
}
