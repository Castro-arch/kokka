import "server-only";
import { and, desc, eq, events, inArray, media, sql, type Event, type Media } from "@kokka/db";
import { isValidSlug } from "@kokka/shared";
import { z } from "zod";
import { getDb } from "./db";

/** Gallery page size; the "Ver mais" link loads the next page through a cursor. */
export const GALLERY_PAGE_SIZE = 30;

/** Own uploads still on their way to the gallery, shown only to the device that sent them. */
const OWN_PENDING_LIMIT = 20;

/**
 * The event behind a guest link. Drafts are not public yet, so they look like unknown slugs.
 * Expired events are returned so the page can say the event is over.
 */
export async function getGuestEvent(slug: string): Promise<Event | undefined> {
  if (!isValidSlug(slug)) return undefined;
  const [event] = await getDb().select().from(events).where(eq(events.slug, slug));
  return event && event.status !== "draft" ? event : undefined;
}

export interface GalleryCursor {
  createdAt: Date;
  id: string;
}

const cursorPattern = /^(\d{13})_([0-9a-f-]{36})$/;

/** `<epoch ms>_<media id>` of the last item shown: stable under new uploads arriving on top. */
export function encodeCursor(item: Pick<Media, "createdAt" | "id">): string {
  return `${item.createdAt.getTime()}_${item.id}`;
}

export function decodeCursor(value: string | undefined): GalleryCursor | undefined {
  const match = value ? cursorPattern.exec(value) : null;
  if (!match?.[1] || !match[2] || !z.uuid().safeParse(match[2]).success) return undefined;
  return { createdAt: new Date(Number(match[1])), id: match[2] };
}

/** Ready media, newest first, after `cursor`. `next` is set when there is another page. */
export async function listGallery(
  eventId: string,
  cursor?: GalleryCursor,
  pageSize = GALLERY_PAGE_SIZE,
): Promise<{ items: Media[]; next?: string }> {
  const rows = await getDb()
    .select()
    .from(media)
    .where(
      and(
        eq(media.eventId, eventId),
        eq(media.status, "ready"),
        cursor
          ? sql`(${media.createdAt}, ${media.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(media.createdAt), desc(media.id))
    .limit(pageSize + 1);

  const items = rows.slice(0, pageSize);
  const last = items.at(-1);
  return { items, next: rows.length > pageSize && last ? encodeCursor(last) : undefined };
}

/** This device's uploads that are not in the gallery yet (uploading, processing or failed). */
export function listOwnPending(eventId: string, deviceId: string): Promise<Media[]> {
  return getDb()
    .select()
    .from(media)
    .where(
      and(
        eq(media.eventId, eventId),
        eq(media.deviceId, deviceId),
        inArray(media.status, ["uploading", "processing", "failed"]),
      ),
    )
    .orderBy(desc(media.createdAt))
    .limit(OWN_PENDING_LIMIT);
}

/** A media item of this event, or undefined for unknown or malformed ids. */
export async function getEventMedia(eventId: string, mediaId: string): Promise<Media | undefined> {
  if (!z.uuid().safeParse(mediaId).success) return undefined;
  const [item] = await getDb()
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.eventId, eventId)));
  return item;
}

/** File name for a downloaded original: `kokka-<slug>-<short id>.<ext>`. */
export function downloadName(slug: string, item: Pick<Media, "id" | "originalKey">): string {
  const ext = item.originalKey.split(".").pop() ?? "bin";
  return `kokka-${slug}-${item.id.slice(0, 8)}.${ext}`;
}
