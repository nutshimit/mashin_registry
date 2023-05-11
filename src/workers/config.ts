import { Build } from "./types";

export type Env = {
  MASHIN_CDN: R2Bucket;
  REGISTRY_SQL: D1Database;
  REGISTRY_QUEUE: Queue<Build>;
  DISCORD_WEBHOOK_PUBLIC: string;
  ALGOLIA_APP_ID: string;
  ALGOLIA_API_KEY: string;
  ALGOLIA_API_KEY_WRITE: string;
  ALGOLIA_INDEX_NAME: string;
};
