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

export function ModulePage({
  isCold,
  module,
  moduleVersion,
}: {
  isCold: boolean;
  module: ApiModuleData;
  moduleVersion: ApiModuleVersion;
}) {
  const readme = useMemo(() => {
    if (!moduleVersion.readme) {
      return `${module.name} v${moduleVersion.version} appears to have no README.md file`;
    }

    return moduleVersion.readme;
  }, [module, moduleVersion]);

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
        <Card>
          <Code code={readme} language="markdown" />
        </Card>
      </Module>
    </div>
  );
}
