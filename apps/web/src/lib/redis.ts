import "server-only";
import { Redis } from "ioredis";
import { getEnv } from "./env";

// Reuse the connection across hot reloads in development.
const globalForRedis = globalThis as unknown as { kokkaRedis?: Redis };

export function getRedis(): Redis {
  globalForRedis.kokkaRedis ??= new Redis(getEnv().REDIS_URL);
  return globalForRedis.kokkaRedis;
}
