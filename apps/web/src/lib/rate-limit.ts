import "server-only";
import { UPLOAD_RATE_LIMIT } from "@kokka/shared";
import type { Redis } from "ioredis";

/**
 * Fixed-window counter: the first hit creates the key with the window as its TTL, later hits only
 * increment it. Returns false once the count goes over `limit`.
 */
export async function hitRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const results = await redis.multi().set(key, 0, "EX", windowSeconds, "NX").incr(key).exec();
  const count = Number(results?.[1]?.[1] ?? Number.POSITIVE_INFINITY);
  return count <= limit;
}

/** One guest upload, counted per device and per IP; false when either is over its limit. */
export async function allowGuestUpload(
  redis: Redis,
  { deviceId, ip }: { deviceId: string; ip: string },
): Promise<boolean> {
  const { windowSeconds, perDevice, perIp } = UPLOAD_RATE_LIMIT;
  const [byDevice, byIp] = await Promise.all([
    hitRateLimit(redis, `ratelimit:upload:device:${deviceId}`, perDevice, windowSeconds),
    hitRateLimit(redis, `ratelimit:upload:ip:${ip}`, perIp, windowSeconds),
  ]);
  return byDevice && byIp;
}
