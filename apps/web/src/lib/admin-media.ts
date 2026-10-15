import "server-only";
import { and, desc, eq, inArray, media } from "@kokka/db";
import type { MediaKind, MediaStatus } from "@kokka/shared";
import { getDb } from "./db";
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
