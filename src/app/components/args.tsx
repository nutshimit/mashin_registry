import { DocPageOutput, DocPageParam } from "../../workers/types";
import { RawMarkdown } from "./code";

export function Inputs({ params }: { params: DocPageParam[] }) {
  return (
    <dl className="divide-y divide-gray-100">
      {params.map((param) => {
        return (
          <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-xs font-medium leading-6 text-slate-700">
              {param.name}
              {!param.optional && <span className="text-red-600">*</span>}
              <div className="text-xs font-light">{param.ts_type?.repr}</div>
            </dt>
            <dd className="mt-1 leading-6 sm:col-span-2 sm:mt-0">
              {param.js_doc?.doc ? (
                <RawMarkdown
                  className="text-xs text-slate-700"
                  code={param.js_doc?.doc}
                />
              ) : (
                `No JSdoc found for ${param.name}.`
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function Outputs({ params }: { params: DocPageOutput[] }) {
  return (
    <dl className="divide-y divide-gray-100">
      {params.map((param) => {
        return (
          <div className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-xs font-medium leading-6 text-slate-700">
              {param.name}
              <div className="text-xs font-light">{param.ts_type?.repr}</div>
            </dt>
            <dd className="mt-1 leading-6 sm:col-span-2 sm:mt-0">
              {param.js_doc?.doc ? (
                <RawMarkdown
                  className="text-xs text-slate-700"
                  code={param.js_doc?.doc}
                />
              ) : (
                `No JSdoc found for ${param.name}.`
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
