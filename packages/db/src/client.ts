import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

/**
 * libpq-only URL parameters that postgres.js does not understand and would forward to the server
 * as session settings, which rejects the connection ("unrecognized configuration parameter").
 * Neon adds `channel_binding=require` to its connection strings; postgres.js has no channel
 * binding, so the link is protected by TLS alone (`sslmode=verify-full` checks the certificate).
 */
const LIBPQ_ONLY_PARAMS = ["channel_binding"];

/** Drops the parameters above, leaving the rest of the URL (credentials included) untouched. */
export function normalizeDatabaseUrl(url: string): string {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) return url;
  const params = new URLSearchParams(url.slice(queryStart + 1));
  for (const name of LIBPQ_ONLY_PARAMS) params.delete(name);
  const query = params.toString();
  return url.slice(0, queryStart) + (query ? `?${query}` : "");
}

export function createDb(url: string, options: postgres.Options<Record<string, never>> = {}) {
  const client = postgres(normalizeDatabaseUrl(url), options);
  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDb>;
