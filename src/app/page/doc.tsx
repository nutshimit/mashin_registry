import { useMemo } from "preact/hooks";
import {
  ApiModuleData,
  ApiModuleVersion,
  DocPageProviderItem,
  DocPageResourceItem,
} from "../../workers/types";
import Nav from "../components/nav";
import Module from "../components/module";
import Code, { RawMarkdown } from "../components/code";
import Card from "../components/card";
import { Inputs, Outputs } from "../components/args";
import Footer from "../components/footer";

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

  return (
    <div className="min-h-full">
      <Nav />
      <Module
        module={module}
        resources={resources}
        moduleVersion={moduleVersion}
      >
        {provider?.js_doc?.doc && (
          <RawMarkdown className="mb-4" code={provider.js_doc.doc} />
        )}

        {provider?.example && (
          <Card
            header={
              <>
                <div className="mr-auto px-2 py-3 flex items-center">
                  <h3 className="text-base font-semibold leading-6 lg:ml-2 text-sky-900">
                    Example
                  </h3>
                </div>
                <div className="-mb-px px-4 py-3">
                  <h3 className="text-base font-extralight leading-6 lg:ml-2 text-sky-700">
                    MashinScript
                  </h3>
                </div>
              </>
            }
          >
            <div className="px-2 text-xs">
              <Code
                language="typescript"
                code={`#!/usr/bin/env mashin run
import * as ${module.name} from "https://mashin.run/${module.name}@${moduleVersion.version}/${moduleVersion.entrypoint}"

const provider = ${provider.example}`}
              />
            </div>
          </Card>
        )}
        <Card
          className="mt-4"
          header={
            <div className="px-4 py-3 flex items-center">
              <h3 className="text-base font-semibold leading-6 lg:ml-2 text-sky-900">
                Arguments
              </h3>
            </div>
          }
        >
          <div className="p-4 text-xs">
            {provider?.params && <Inputs params={provider.params} />}
          </div>
        </Card>

        {resources.map((resource) => {
          return (
            <>
              <hr className="mt-4" />
              <h1 id={resource.name} class="mt-2 scroll-mt-32 text-xl">
                {resource.name}
              </h1>

              <div className="grid grid-cols-1 items-start gap-x-4 gap-y-10 xl:max-w-none xl:grid-cols-2">
                <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
                  <p className="font-light text-sm mb-4">
                    {resource.js_doc?.doc ? (
                      <RawMarkdown code={resource.js_doc.doc} />
                    ) : (
                      "No documentation found"
                    )}
                  </p>

                  {resource?.params && resource.params.length > 0 && (
                    <>
                      <h3 className="text-slate-700">Arguments</h3>
                      <div className="p-4 text-xs">
                        <Inputs params={resource.params} />
                      </div>
                    </>
                  )}

                  {resource?.params &&
                    resource.params.length > 0 &&
                    resource?.output &&
                    resource.output.length > 0 && <hr className="mb-4" />}

                  {resource?.output && resource.output.length > 0 && (
                    <>
                      <h3 className="text-sm text-slate-700">Output</h3>
                      <div className="p-4 text-xs">
                        <Outputs params={resource.output} />
                      </div>
                    </>
                  )}
                </div>
                <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0 xl:sticky xl:top-24">
                  {resource.example && (
                    <Card
                      header={
                        <>
                          <div className="px-2 mr-auto py-3 flex items-center">
                            <h3 className="text-sm font-normal leading-6 lg:ml-2 text-slate-900">
                              Example
                            </h3>
                          </div>
                          <div className="-mb-px px-4 py-3">
                            <h3 className="text-sm font-extralight leading-6 lg:ml-2 text-sky-700">
                              MashinScript
                            </h3>
                          </div>
                        </>
                      }
                    >
                      <div className="px-2 text-xs">
                        <Code code={resource.example} language="typescript" />
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </>
          );
        })}
      </Module>
      <Footer isCold={isCold} />
    </div>
  );
}
