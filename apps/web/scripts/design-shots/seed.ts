import { randomUUID } from "node:crypto";
import {
  account,
  createDb,
  events,
  exports,
  media,
  seedAdmin,
  session,
  sql,
  user,
  verification,
  type NewEvent,
  type NewMedia,
} from "@kokka/db";
import { TILE_TONES, tileTone } from "../../src/lib/media-tone.ts";

/** The only database this seed may wipe; anything else is refused. */
export const SHOTS_DATABASE = "kokka_shots";

export const SHOTS_ADMIN = {
  name: "José",
  email: "jose@kokka.local",
  password: "design-shots-only-0000",
};

export interface SeededIds {
  live: string;
  draft: string;
  closed: string;
  expired: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Most recent 19:00 (local time) at or before `now`, so "começou às 19h" matches the mockups. */
function lastSevenPm(now: Date): Date {
  const date = new Date(now);
  date.setHours(19, 0, 0, 0);
  if (date > now) date.setTime(date.getTime() - DAY);
  return date;
}

/** Same day and hour as `base`, shifted by whole days. */
const daysFrom = (base: Date, days: number) => new Date(base.getTime() + days * DAY);

interface Slot {
  kind: "image" | "video";
  status: NewMedia["status"];
  durationMs?: number;
}

/**
 * The live event's media, newest first, laid out like docs/design/admin/midias.html: hidden tiles,
 * a failed and a processing one, and videos with the mockup's durations.
 */
function liveSlots(): Slot[] {
  const slots: Slot[] = Array.from({ length: 143 }, () => ({ kind: "image", status: "ready" }));
  const videos: Record<number, number> = { 2: 42, 6: 75, 13: 171, 19: 18 };
  for (const index of [30, 41, 52, 63, 74, 85, 96, 107, 118, 129]) videos[index] = 35;
  for (const [index, seconds] of Object.entries(videos)) {
    slots[Number(index)] = { kind: "video", status: "ready", durationMs: seconds * 1000 };
  }
  for (const index of [4, 16, 22]) slots[index] = { kind: "image", status: "hidden" };
  slots[9] = { kind: "image", status: "failed" };
  slots[11] = { kind: "image", status: "processing" };
  return slots;
}

/** An id whose pastel tile (tileTone) is the one the mockup shows in that grid column. */
function idWithTone(index: number): string {
  const tone = TILE_TONES[index % TILE_TONES.length];
  for (;;) {
    const id = randomUUID();
    if (tileTone(id) === tone) return id;
  }
}

function mediaRow(
  eventId: string,
  slot: Slot,
  createdAt: Date,
  device: number,
  index = 0,
): NewMedia {
  const id = idWithTone(index);
  const video = slot.kind === "video";
  return {
    id,
    eventId,
    kind: slot.kind,
    status: slot.status,
    originalKey: `events/${eventId}/original/${id}.${video ? "mp4" : "jpg"}`,
    originalMime: video ? "video/mp4" : "image/jpeg",
    // About 4,2 GB in total for the live event, like the mockup.
    sizeBytes: video ? 270_000_000 : 3_500_000,
    width: video ? 1280 : 3024,
    height: video ? 720 : 4032,
    durationMs: slot.durationMs ?? null,
    thumbKey: null,
    displayKey: null,
    deviceId: `shots-device-${String(device)}`,
    uploadedAt: createdAt,
    createdAt,
  };
}

/** Wipes the shots database and fills it with the data shown in docs/design/admin. */
export async function seedShots(databaseUrl: string, now = new Date()): Promise<SeededIds> {
  if (new URL(databaseUrl).pathname !== `/${SHOTS_DATABASE}`) {
    throw new Error(`Refusing to seed a database other than ${SHOTS_DATABASE}`);
  }
  const db = createDb(databaseUrl, { max: 1 });
  try {
    await db.execute(
      sql`truncate ${media}, ${exports}, ${events}, ${session}, ${account}, ${verification}, ${user} cascade`,
    );
    await seedAdmin(db, SHOTS_ADMIN);

    const liveStart = lastSevenPm(now);
    // Counted from today (not from the live start), so the trail says "faltam 46 dias".
    const todayAtSeven = new Date(now);
    todayAtSeven.setHours(19, 0, 0, 0);
    const draftStart = daysFrom(todayAtSeven, 46);
    const closedStart = daysFrom(liveStart, -3);
    const closedAt = daysFrom(liveStart, -2);
    const expiredStart = daysFrom(liveStart, -24);

    const rows: NewEvent[] = [
      {
        slug: "anapedro",
        name: "Ana & Pedro",
        subtitle: "Casamento",
        startsAt: liveStart,
        endsAt: new Date(liveStart.getTime() + 8 * HOUR),
        status: "active",
        theme: { primaryColor: "#c2703d", font: "playfair" },
        createdAt: daysFrom(liveStart, -12),
      },
      {
        slug: "julia15",
        name: "15 anos da Júlia",
        subtitle: "15 anos",
        startsAt: draftStart,
        endsAt: new Date(draftStart.getTime() + 6 * HOUR),
        status: "draft",
        theme: {},
        createdAt: daysFrom(liveStart, -1),
      },
      {
        slug: "bodasprata",
        name: "Bodas de Prata",
        subtitle: "Bodas",
        startsAt: closedStart,
        endsAt: closedAt,
        status: "closed",
        closedAt,
        expiresAt: daysFrom(closedAt, 5),
        theme: {},
        createdAt: daysFrom(liveStart, -30),
      },
      {
        slug: "formaturamed",
        name: "Formatura Med 2026",
        subtitle: "Formatura",
        startsAt: expiredStart,
        endsAt: daysFrom(expiredStart, 1),
        status: "expired",
        closedAt: daysFrom(expiredStart, 1),
        expiresAt: daysFrom(expiredStart, 6),
        theme: {},
        createdAt: daysFrom(liveStart, -60),
      },
    ];
    const inserted = await db.insert(events).values(rows).returning({ id: events.id });
    const [live, draft, closed, expired] = inserted.map((row) => row.id);
    if (!live || !draft || !closed || !expired) throw new Error("Seed did not insert 4 events");

    const lastUpload = now.getTime() - 2 * MINUTE;
    const liveMedia = liveSlots().map((slot, index) =>
      mediaRow(live, slot, new Date(lastUpload - index * MINUTE), index % 63, index),
    );
    const closedMedia = Array.from({ length: 449 }, (_, index) =>
      mediaRow(
        closed,
        { kind: "image", status: "ready" },
        new Date(closedAt.getTime() - index * MINUTE),
        index % 90,
      ),
    );
    await db.insert(media).values([...liveMedia, ...closedMedia]);

    return { live, draft, closed, expired };
  } finally {
    await db.$client.end();
  }
}
