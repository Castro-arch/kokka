import "server-only";
import { and, desc, eq, inArray, media, sql } from "@kokka/db";
import type { MediaKind, MediaStatus } from "@kokka/shared";
import { getDb } from "./db";
import { encodeCursor, filterCriteria, type MediaCursor, type MediaFilter } from "./media-filters";
import { getStorage } from "./storage";

export interface AdminMediaItem {
  id: string;
  kind: MediaKind;
  status: MediaStatus;
  durationMs: number | null;
  /** Signed, short-lived thumbnail URL; null until the worker has made one. */
  thumbUrl: string | null;
}

/** The newest uploads of an event still headed for the gallery ("Chegando agora"). */
export async function recentMedia(eventId: string, limit: number): Promise<AdminMediaItem[]> {
  const rows = await getDb()
    .select({
      id: media.id,
      kind: media.kind,
      status: media.status,
      durationMs: media.durationMs,
      thumbKey: media.thumbKey,
    })
    .from(media)
    .where(and(eq(media.eventId, eventId), inArray(media.status, ["processing", "ready"])))
    .orderBy(desc(media.createdAt))
    .limit(limit);
  return withThumbUrls(rows);
}

export async function withThumbUrls<T extends { thumbKey: string | null }>(
  rows: T[],
): Promise<(Omit<T, "thumbKey"> & { thumbUrl: string | null })[]> {
  const storage = getStorage();
  return Promise.all(
    rows.map(async ({ thumbKey, ...row }) => ({
      ...row,
      thumbUrl: thumbKey ? await storage.signedGetUrl(thumbKey) : null,
    })),
  );
}

export type MediaCounts = Record<MediaFilter, number>;

/** Count behind each filter chip, in a single query. */
export async function mediaCounts(eventId: string): Promise<MediaCounts> {
  const received = sql`${media.status} in ('processing', 'ready', 'hidden')`;
  const [row] = await getDb()
    .select({
      todas: sql<number>`count(*) filter (where ${media.status} <> 'uploading')::int`,
      fotos: sql<number>`count(*) filter (where ${received} and ${media.kind} = 'image')::int`,
      videos: sql<number>`count(*) filter (where ${received} and ${media.kind} = 'video')::int`,
      ocultas: sql<number>`count(*) filter (where ${media.status} = 'hidden')::int`,
      falhou: sql<number>`count(*) filter (where ${media.status} = 'failed')::int`,
    })
    .from(media)
    .where(eq(media.eventId, eventId));
  return row ?? { todas: 0, fotos: 0, videos: 0, ocultas: 0, falhou: 0 };
}

export interface MediaPage {
  items: AdminMediaItem[];
  /** `?depois=` value for the next (older) page; undefined on the last one. */
  next: string | undefined;
}

/** One page of the media of an event, newest first, keyed by (created_at, id) like its index. */
export async function listMedia(
  eventId: string,
  filter: MediaFilter,
  cursor: MediaCursor | undefined,
  limit: number,
): Promise<MediaPage> {
  const { statuses, kind } = filterCriteria(filter);
  const rows = await getDb()
    .select({
      id: media.id,
      kind: media.kind,
      status: media.status,
      durationMs: media.durationMs,
      thumbKey: media.thumbKey,
      // Microsecond precision, so the cursor never skips uploads from the same millisecond.
      cursorAt: sql<string>`to_char(${media.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    })
    .from(media)
    .where(
      and(
        eq(media.eventId, eventId),
        inArray(media.status, statuses),
        kind ? eq(media.kind, kind) : undefined,
        cursor
          ? sql`(${media.createdAt}, ${media.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(media.createdAt), desc(media.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const items = await withThumbUrls(page.map(({ cursorAt: _cursorAt, ...item }) => item));
  const more = rows.length > limit && last;
  return {
    items,
    next: more ? encodeCursor({ createdAt: last.cursorAt, id: last.id }) : undefined,
  };
}
