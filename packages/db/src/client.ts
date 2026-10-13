import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export function createDb(url: string, options: postgres.Options<Record<string, never>> = {}) {
  const client = postgres(url, options);
  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDb>;
