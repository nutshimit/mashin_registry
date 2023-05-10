import { DocNode } from "./doc";
import { type PayloadReleaseAsset } from "./webhooks.d";
import { type TsTypeParamDef, TsTypeDef, ParamDef, JsDoc } from "./doc.d";

export interface ModuleMetaVersionsJson {
  latest: string;
  versions: string[];
}

export interface ApiModuleDataResponse {
  data: ApiModuleData;
}

export interface ApiModuleDataCore {
  name: string;
  type: "std" | "provider";
  repo_id: number;
  owner: string;
  repo: string;
  description: string;
  star_count: number;
  is_unlisted: boolean;
  created_at: Date;
}

export interface ApiModuleDataRaw extends ApiModuleDataCore {
  latest_version_id: number | null | undefined;
}

export interface ApiModuleDataFlattenVersion extends ApiModuleDataCore {
  latest_version: string | null;
}

export interface ApiModuleData extends ApiModuleDataCore {
  latest_version: string | null;
  versions: string[];
}

export interface ApiModuleVersionRaw {
  id: number;
  module: string;
  entrypoint: string;
  major: number;
  minor: number;
  patch: number;
  windows_x86: boolean;
  macos_x86: boolean;
  linux_x86: boolean;
  doc: string;
  readme: string;
  created_at: Date;
}

export type SemVerObject = {
  version: string;
  matches: boolean;
  major: number | undefined;
  minor: number | undefined;
  patch: number | undefined;
  pre: Array<string | number> | undefined;
  build: Array<string | number> | undefined;
};

export type SourceFileType = "typescript" | "markdown";

export interface ApiModuleVersion {
  id: number;
  module: string;
  entrypoint: string;
  version: string;
  windows_x86: boolean;
  macos_x86: boolean;
  linux_x86: boolean;
  doc?: DocPageModuleItem[];
  readme?: string;
  created_at: Date;
}

export type ModuleType = "std" | "provider";

export type BuildStatus = "queued" | "success" | "error" | "publishing";

export interface Build {
  id: string;
  module: string;
  version: string;
  status: BuildStatus;
  message?: string;
  assets: PayloadReleaseAsset[];
  created_at: Date;
}

export type DocPageModuleItem = DocPageResourceItem | DocPageProviderItem;

export interface DocPageResourceItem {
  kind: "resource";
  name: string;
  js_doc: JsDoc | undefined;
  params: DocPageParam[];
  output: DocPageOutput[];
  example: string | null;
}

export interface DocPageProviderItem {
  kind: "provider";
  js_doc: JsDoc | undefined;
  params: DocPageParam[];
  example: string | null;
}

export interface DocPageParam {
  name: string;
  js_doc: JsDoc | null;
  optional: boolean;
  ts_type: TsTypeDef | null;
}

export interface DocPageOutput {
  name: string;
  js_doc: JsDoc | null;
  ts_type: TsTypeDef | null;
}

export type FileType = FileReadme | FileExample;

export interface FileReadme {
  kind: "readme";
  value: Uint8Array;
}

export interface FileExample {
  kind: "example";
  resource: string;
  value: Uint8Array;
}
