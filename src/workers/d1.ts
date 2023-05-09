import { type DocNode } from "./doc.d";
import {
  ApiModuleData,
  ApiModuleDataFlattenVersion,
  ApiModuleDataRaw,
  ApiModuleVersion,
  ApiModuleVersionRaw,
  Build,
  DocPageModuleItem,
  ModuleType,
  SemVerObject,
} from "./types";
import { parseSemVer } from "semver-parser";

export async function getModule(
  database: D1Database,
  name: string
): Promise<ApiModuleData | null> {
  const rawData = await database
    .prepare("SELECT * FROM module WHERE name = ?")
    .bind(name)
    .first<ApiModuleDataRaw>();

  if (rawData) {
    let lastVersion: ApiModuleVersion | null = null;
    if (rawData.latest_version_id) {
      lastVersion = await getModuleVersionById(
        database,
        rawData.latest_version_id
      );
    }

    const versions: string[] = await getModuleVersions(database, name);
    delete rawData.latest_version_id;
    return {
      ...rawData,
      latest_version: lastVersion?.version || null,
      versions,
    };
  }

  return null;
}

export async function getModulesCount(
  database: D1Database,
  type: ModuleType
): Promise<number> {
  return await database
    .prepare("SELECT COUNT(*) as total FROM module WHERE type = ?")
    .bind(type)
    .first("total");
}

export async function getModules(
  database: D1Database,
  type: ModuleType,
  page: number = 1,
  limit: number = 10
): Promise<ApiModuleDataFlattenVersion[]> {
  const offset = (page - 1) * limit;

  const rawData = await database
    .prepare(
      "SELECT * FROM module WHERE type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(type, limit, offset)
    .all<ApiModuleDataRaw>();

  const allResults = [];
  if (rawData.results) {
    for await (const data of rawData.results) {
      let lastVersion: ApiModuleVersion | null = null;
      if (data.latest_version_id) {
        lastVersion = await getModuleVersionById(
          database,
          data.latest_version_id
        );
      }

      delete data.latest_version_id;
      allResults.push({
        ...data,
        latest_version: lastVersion?.version || null,
      });
    }
  }

  return allResults;
}

export async function getRawModuleVersion(
  database: D1Database,
  module: string,
  version: SemVerObject
): Promise<ApiModuleVersionRaw | null> {
  return await database
    .prepare(
      "SELECT * FROM module_version WHERE module = ? AND major = ? AND minor = ? AND patch = ?"
    )
    .bind(module, version.major, version.minor, version.patch)
    .first();
}

export async function getModuleVersion(
  database: D1Database,
  module: string,
  version: SemVerObject
): Promise<ApiModuleVersion | null> {
  const rawData = await getRawModuleVersion(database, module, version);

  if (rawData) {
    return {
      ...rawData,
      doc: JSON.parse(rawData.doc),
      version: version.version,
    };
  }

  return null;
}

export async function getModuleVersions(
  database: D1Database,
  module: string
): Promise<string[]> {
  const rawData = (
    await database
      .prepare(
        "SELECT * FROM module_version WHERE module = ? ORDER BY major DESC, minor DESC, patch DESC"
      )
      .bind(module)
      .all<ApiModuleVersionRaw | null>()
  ).results;
  const finalResults = [];
  if (rawData) {
    for await (const data of rawData) {
      if (data) {
        finalResults.push(`${data.major}.${data.minor}.${data.patch}`);
      }
    }
  }

  return finalResults;
}

async function getModuleVersionById(
  database: D1Database,
  id: number
): Promise<ApiModuleVersion | null> {
  const rawData = await database
    .prepare("SELECT * FROM module_version WHERE id = ?")
    .bind(id)
    .first<ApiModuleVersionRaw | null>();

  if (rawData) {
    return {
      ...rawData,
      doc: JSON.parse(rawData.doc),
      version: `${rawData.major}.${rawData.minor}.${rawData.patch}`,
    };
  }

  return null;
}

export async function createVersion(
  database: D1Database,
  module: string,
  entrypoint: string,
  version: SemVerObject,
  platforms: { windows_x86: boolean; macos_x86: boolean; linux_x86: boolean },
  doc: DocPageModuleItem[],
  readme: string | null
): Promise<number> {
  const executed = await database
    .prepare(
      `INSERT INTO module_version (module, entrypoint, major, minor, patch, windows_x86, macos_x86, linux_x86, doc, readme, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      module,
      entrypoint,
      version.major,
      version.minor,
      version.patch,
      platforms.windows_x86 ? 1 : 0,
      platforms.macos_x86 ? 1 : 0,
      platforms.linux_x86 ? 1 : 0,
      JSON.stringify(doc),
      readme,
      new Date().toUTCString()
    )
    .run<ApiModuleVersionRaw>();

  return executed.meta.last_row_id as number;
}

export async function createBuild(database: D1Database, build: Build) {
  const { id, created_at, module, status, version, message } = build;
  const realMessage = message ? message : "";
  await database
    .prepare(
      `INSERT INTO build (id, module, version, status, message, created_at) 
    VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, module, version, status, realMessage, created_at.toUTCString())
    .run();
}

export async function upsertModule(
  database: D1Database,
  module: ApiModuleData
) {
  const {
    name,
    type,
    repo_id,
    owner,
    repo,
    description,
    star_count,
    is_unlisted,
    created_at,
  } = module;

  const exist = await getModule(database, module.name);
  if (exist) {
    await database
      .prepare(
        `UPDATE module SET description = ?, star_count = ?, is_unlisted = ? WHERE name = ?`
      )
      .bind(description, star_count, is_unlisted ? 1 : 0, name)
      .run();
  } else {
    await database
      .prepare(
        `INSERT INTO module (name, type, repo_id, owner, repo, description, star_count, is_unlisted, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        name,
        type,
        repo_id,
        owner,
        repo,
        description,
        star_count,
        is_unlisted ? 1 : 0,
        created_at.toUTCString()
      )
      .run();
  }
}

export async function isForbidden(
  database: D1Database,
  name: string
): Promise<boolean> {
  const isFound = await database
    .prepare(
      "SELECT COUNT(*) as total FROM bad_words WHERE ? LIKE '%' || word || '%'"
    )
    .bind(name)
    .first<number | null>("total");
  return isFound && isFound > 0 ? true : false;
}

export async function setModuleLastVersion(
  database: D1Database,
  name: string,
  versionId: number
) {
  await database
    .prepare(`UPDATE module SET latest_version_id = ? WHERE name = ?`)
    .bind(versionId, name)
    .run();
}

export async function setBuildSuccess(database: D1Database, buildId: string) {
  await database
    .prepare(`UPDATE build SET status = ? WHERE id = ?`)
    .bind("success", buildId)
    .run();
}

export async function setBuildFailed(
  database: D1Database,
  buildId: string,
  message: string
) {
  await database
    .prepare(`UPDATE build SET status = ?, message = ? WHERE id = ?`)
    .bind("error", message, buildId)
    .run();
}
