import "server-only";
import { createDb, type Database } from "@kokka/db";
import { getEnv } from "./env";

// Reuse the pool across hot reloads in development.
const globalForDb = globalThis as unknown as { kokkaDb?: Database };

export function getDb(): Database {
  globalForDb.kokkaDb ??= createDb(getEnv().DATABASE_URL);
  return globalForDb.kokkaDb;
}
