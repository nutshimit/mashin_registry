import { Build } from "./types";

export type Env = {
  MASHIN_CDN: R2Bucket;
  REGISTRY_SQL: D1Database;
  REGISTRY_QUEUE: Queue<Build>;
};
