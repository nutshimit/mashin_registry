import { Env } from "./config";
import { generateDocs } from "./doc";
import { type DocNode } from "./doc.d";
import {
  createVersion,
  getModule,
  getModuleVersion,
  setBuildFailed,
  setBuildSuccess,
  setModuleLastVersion,
} from "./d1";
import { ApiModuleData, Build } from "./types";
import { parseSemVer } from "semver-parser";
import JSZip from "jszip";

export async function processBuild(env: Env, build: Build) {
  let module = await getModule(env.REGISTRY_SQL, build.module);
  switch (module?.type) {
    case "provider":
      return await processBuildProvider(env, build, module);
    case "std":
      return await processBuildStd(env, build, module);
    default:
      return await setBuildFailed(
        env.REGISTRY_SQL,
        build.id,
        "invalid module type"
      );
  }
}

export async function processBuildStd(
  env: Env,
  build: Build,
  module: ApiModuleData
) {
  try {
    let foundVersion = build.version;
    if (foundVersion.startsWith("v")) {
      foundVersion = foundVersion.slice(1);
    }

    const version = parseSemVer(foundVersion);
    if (!module) {
      await setBuildFailed(env.REGISTRY_SQL, build.id, "module not registered");
      return;
    }

    if (!version) {
      await setBuildFailed(env.REGISTRY_SQL, build.id, "invalid version");
      return;
    }

    const existingVersion = await getModuleVersion(
      env.REGISTRY_SQL,
      module.name,
      version
    );

    // already exists
    if (existingVersion) {
      await setBuildFailed(
        env.REGISTRY_SQL,
        build.id,
        "version already exists"
      );
      return;
    }

    const readme = await syncZipReleaseToR2(
      env,
      module.owner,
      module.repo,
      build.version
    );

    const readmeText = readme ? new TextDecoder().decode(readme) : null;
    const versionId = await createVersion(
      env.REGISTRY_SQL,
      module.name,
      "",
      version,
      {
        linux_x86: true,
        macos_x86: true,
        windows_x86: true,
      },
      [],
      readmeText
    );

    await setModuleLastVersion(env.REGISTRY_SQL, module.name, versionId);
    await setBuildSuccess(env.REGISTRY_SQL, build.id);
  } catch (error: any) {
    await setBuildFailed(env.REGISTRY_SQL, build.id, error.message);
  }
}

async function syncZipReleaseToR2(
  env: Env,
  owner: string,
  repo: string,
  version: string
) {
  const download = await fetch(
    `https://github.com/${owner}/${repo}/archive/refs/tags/${version}.zip`
  );

  const zip = new JSZip();
  const data = await zip.loadAsync(await download.arrayBuffer());
  let readme: Uint8Array | undefined = undefined;

  for await (const relativePath of Object.keys(data.files)) {
    const file = data.files[relativePath];
    if (
      file.name.endsWith(".ts") ||
      file.name.endsWith(".md") ||
      file.name.endsWith("LICENSE") ||
      file.name.endsWith("README")
    ) {
      const res = await file.async("uint8array");
      await env.MASHIN_CDN.put(`${owner}/${relativePath}`, res);

      let trimmedVersion = version;
      if (version.startsWith("v")) {
        trimmedVersion = version.slice(1);
      }
      if (
        file.name === `${repo}-${trimmedVersion}/README` ||
        file.name === `${repo}-${trimmedVersion}/README.md`
      ) {
        readme = res;
      }
    }
  }

  return readme;
}

export async function processBuildProvider(
  env: Env,
  build: Build,
  module: ApiModuleData
) {
  try {
    let foundVersion = build.version;
    if (foundVersion.startsWith("v")) {
      foundVersion = foundVersion.slice(1);
    }

    const version = parseSemVer(foundVersion);
    if (!module) {
      await setBuildFailed(env.REGISTRY_SQL, build.id, "module not registered");
      return;
    }

    if (!version) {
      await setBuildFailed(env.REGISTRY_SQL, build.id, "invalid version");
      return;
    }

    const existingVersion = await getModuleVersion(
      env.REGISTRY_SQL,
      module.name,
      version
    );

    // already exists
    if (existingVersion) {
      await setBuildFailed(
        env.REGISTRY_SQL,
        build.id,
        "version already exists"
      );
      return;
    }

    const windows_x86 = !!build.assets.find((asset) =>
      asset.name.endsWith(".dll")
    );
    const macos_x86 = !!build.assets.find((asset) =>
      asset.name.endsWith(".dylib")
    );
    const linux_x86 = !!build.assets.find((asset) =>
      asset.name.endsWith(".so")
    );

    let doc: DocNode[] = [];
    let foundDoc = build.assets.find((asset) => asset.name === "mod.json");

    if (foundDoc) {
      const moduleDoc = await fetch(foundDoc.browser_download_url);
      try {
        doc = await moduleDoc.json();
      } catch (error) {
        console.error(error);
      }
    }

    const entrypoint = "mod.ts";
    const finalDoc = generateDocs(doc);

    const readme = await syncZipReleaseToR2(
      env,
      module.owner,
      module.repo,
      build.version
    );

    // if `mod.ts` is in the release, we should overwrite it
    let foundModule = build.assets.find((asset) => asset.name === "mod.ts");
    if (foundModule) {
      const file = await fetch(foundModule.browser_download_url);
      const res = await file.arrayBuffer();
      env.MASHIN_CDN.put(
        `${module.owner}/${module.repo}-${version.version}/mod.ts`,
        res
      );
    }

    const readmeText = readme ? new TextDecoder().decode(readme) : null;
    const versionId = await createVersion(
      env.REGISTRY_SQL,
      module.name,
      entrypoint,
      version,
      {
        linux_x86,
        macos_x86,
        windows_x86,
      },
      finalDoc,
      readmeText
    );

    await setModuleLastVersion(env.REGISTRY_SQL, module.name, versionId);
    await setBuildSuccess(env.REGISTRY_SQL, build.id);
  } catch (error: any) {
    await setBuildFailed(env.REGISTRY_SQL, build.id, error.message);
  }
}