import { ComponentChildren } from "preact";
import {
  ApiModuleData,
  ApiModuleVersion,
  DocPageResourceItem,
} from "../../workers/types";
import { Documentation, Github, NoSymbol, YesSymbol } from "./icons";
import { useMemo } from "preact/hooks";

function SupportedIcon({ supported }: { supported: boolean }) {
  return supported ? (
    <YesSymbol className="w-4 h-4 text-green-900" />
  ) : (
    <NoSymbol className="w-4 h-4 text-red-900" />
  );
}

export default function Module({
  moduleVersion,
  module,
  children,
  resources,
}: {
  moduleVersion: ApiModuleVersion;
  module: ApiModuleData;
  children: ComponentChildren;
  resources: DocPageResourceItem[];
}) {
  return (
    <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8 grid lg:grid-cols-4">
      <div className="col-start-1 row-end-1 mb-10 lg:mb-0 lg:pr-2">
        <a href={`/${module.name}@${moduleVersion.version}`}>{module.name}</a>
        <span className="ml-2 inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          v{moduleVersion.version}
        </span>
        <p className="text-xs font-light pr-2">{module.description}</p>
        <ul className="mt-2">
          <li className="flex items-center">
            <Documentation className="w-4 h-4 text-sky-800" />
            <a
              href={`/${module.name}@${moduleVersion.version}/doc`}
              className="text-sky-800 hover:text-sky-600"
            >
              View Documentation
            </a>
          </li>
        </ul>

        <h4 className="mt-4">Supported platforms</h4>
        <ul className="text-sm font-light">
          <li className="flex items-center">
            <SupportedIcon supported={moduleVersion.macos_x86} />
            <span className="text-slate-600 text-">macOS</span>
          </li>
          <li className="flex items-center">
            <SupportedIcon supported={moduleVersion.linux_x86} />
            <span className="text-slate-600 text-">Linux</span>
          </li>
          <li className="flex items-center">
            <SupportedIcon supported={moduleVersion.windows_x86} />
            <span className="text-slate-600 text-">Windows</span>
          </li>
        </ul>

        <h4 className="mt-4">Repository</h4>
        <ul>
          <li className="flex items-center">
            <Github className="w-4 h-4 text-sky-800" />
            <a
              href={`https://github.com/${module.owner}/${module.repo}`}
              className="text-sky-800 hover:text-sky-600"
            >
              {module.owner}/{module.repo}
            </a>
          </li>
        </ul>

        <h4 className="mt-4">Resources</h4>
        <ul>
          {resources?.map((resource) => {
            return (
              <li>
                <a
                  href={`/${module.name}@${moduleVersion.version}/doc#${resource.name}`}
                  className="text-sky-800 hover:text-sky-600"
                >
                  {resource.name}
                </a>
              </li>
            );
          })}
        </ul>

        <h4 className="mt-4">Versions</h4>
        <ul>
          {module.versions?.map((version) => {
            const isLatest = version === module.latest_version;
            return (
              <li className="flex items-center space-x-2">
                <a
                  href={`/${module.name}@${version}`}
                  className="text-sky-800 hover:text-sky-600"
                >
                  {version}{" "}
                </a>
                {isLatest && (
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    latest
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="col-span-3 row-span-2 lg:row-end-2">{children}</div>
    </div>
  );
}
