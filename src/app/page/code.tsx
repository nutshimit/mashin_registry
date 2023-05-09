import { useMemo } from "preact/hooks";
import {
  ApiModuleData,
  ApiModuleVersion,
  DocPageResourceItem,
} from "../../workers/types";
import Nav from "../components/nav";
import { Document, Github } from "../components/icons";
import Module from "../components/module";
import Code from "../components/code";
import Card from "../components/card";

export function CodePage({
  isCold,
  rawCode,
  module,
  moduleVersion,
  path,
}: {
  isCold: boolean;
  rawCode: string;
  module: ApiModuleData;
  moduleVersion: ApiModuleVersion;
  path: string;
}) {
  const language = useMemo(() => {
    if (path.endsWith(".md")) {
      return "markdown";
    }

    return "typescript";
  }, [path]);

  const resources = useMemo(() => {
    if (moduleVersion.doc) {
      const provider = moduleVersion.doc.filter((item) => {
        return item.kind === "resource";
      }) as DocPageResourceItem[];

      return provider;
    }
    return [];
  }, [moduleVersion]);

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
            <>
              <div className="px-4 py-5 flex items-center">
                <Document className="h-4 w-4 flex-none stroke-sky-500" />
                <h3 className="text-base font-semibold leading-6  lg:ml-2 text-slate-900">
                  {path}
                </h3>
              </div>
              <div className="px-4 py-5">
                <a
                  href={`https://github.com/${module.owner}/${module.repo}/releases/tag/v${moduleVersion.version}`}
                  class=" inline-flex items-center rounded-md bg-white px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <Github className="h-4 w-4 fill-slate-900 pr-1" />
                  <span>Github</span>
                </a>
              </div>
            </>
          }
        >
          <Code code={rawCode} language={language} />
        </Card>
      </Module>
    </div>
  );
}
