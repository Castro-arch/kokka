import "server-only";
import { and, eq, inArray, media, sql } from "@kokka/db";
import { getDb } from "./db";

/** What the admin shows about an event's uploads (hero, event page, trail). */
export interface EventStats {
  images: number;
  videos: number;
  /** Distinct guest phones that sent something. */
  devices: number;
  /** Size of the originals, in bytes. */
  bytes: number;
  lastUploadAt: Date | null;
}

export const EMPTY_STATS: EventStats = {
  images: 0,
  videos: 0,
  devices: 0,
  bytes: 0,
  lastUploadAt: null,
};

/** Media guests sent and that made it to storage (on their way to or in the gallery). */
const RECEIVED = inArray(media.status, ["processing", "ready", "hidden"]);

/**
 * Stats of every event (or only `eventId`) in a single aggregated query; events without uploads
 * are absent from the map.
 */
export async function statsByEvent(eventId?: string): Promise<Map<string, EventStats>> {
  const rows = await getDb()
    .select({
      eventId: media.eventId,
      images: sql<number>`count(*) filter (where ${media.kind} = 'image')::int`,
      videos: sql<number>`count(*) filter (where ${media.kind} = 'video')::int`,
      devices: sql<number>`count(distinct ${media.deviceId})::int`,
      bytes: sql<number>`coalesce(sum(${media.sizeBytes}), 0)::float8`,
      lastUploadAt: sql<string | null>`max(${media.createdAt})`,
    })
    .from(media)
    .where(eventId ? and(RECEIVED, eq(media.eventId, eventId)) : RECEIVED)
    .groupBy(media.eventId);
  return new Map(
    rows.map(({ eventId, lastUploadAt, ...counts }) => [
      eventId,
      { ...counts, lastUploadAt: lastUploadAt === null ? null : new Date(lastUploadAt) },
    ]),
  );
}

/** Photos plus videos: the "envios" of the trail. */
export function totalUploads(stats: EventStats): number {
  return stats.images + stats.videos;
}

const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** "4,2 GB": one decimal from GB up, whole numbers below (pt-BR comma). */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = unit >= 3 && value < 100 ? 1 : 0;
  const number = value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${number} ${UNITS[unit] ?? "B"}`;
}

/** Time since an upload, short: "agora", "2 min", "3 h", "2 dias". */
export function formatSince(date: Date, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${String(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 dia" : `${String(days)} dias`;
}
