import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { decodeCursor, downloadName, encodeCursor, eventInitials } from "./guest";

describe("gallery cursor", () => {
  it("round-trips the last item shown", () => {
    const item = { createdAt: new Date("2026-12-12T21:30:00.123Z"), id: randomUUID() };
    expect(decodeCursor(encodeCursor(item))).toEqual(item);
  });

  it("ignores missing or tampered values", () => {
    expect(decodeCursor(undefined)).toBeUndefined();
    expect(decodeCursor("abc")).toBeUndefined();
    expect(decodeCursor(`1791989060278_${"x".repeat(36)}`)).toBeUndefined();
  });
});

describe("eventInitials", () => {
  it("keeps couples as A&P and shortens other names", () => {
    expect(eventInitials("Ana & Pedro")).toBe("A&P");
    expect(eventInitials("Bodas de Prata")).toBe("BP");
    expect(eventInitials("15 anos da Júlia")).toBe("AJ");
    expect(eventInitials("Kokka")).toBe("K");
  });
});

describe("downloadName", () => {
  it("names the original after the event and keeps its extension", () => {
    const id = "3e3a4277-1487-4822-acd7-3a5eeb7f0a0c";
    expect(downloadName("u29z8r", { id, originalKey: `events/e/original/${id}.heic` })).toBe(
      "kokka-u29z8r-3e3a4277.heic",
    );
  });
});

// Runs in CI against a migrated Postgres; skipped locally unless the env is set.
describe.runIf(Boolean(process.env.DATABASE_URL))("guest queries", async () => {
  const { eq, events, media } = await import("@kokka/db");
  const { countGallery, getGuestEvent, listGallery, listOwnPending } = await import("./guest");
  const { createEvent, transitionEvent } = await import("./events");
  const { getDb } = await import("./db");

  const created: string[] = [];
  afterAll(async () => {
    for (const id of created) await getDb().delete(events).where(eq(events.id, id));
  });

  const activeEvent = async () => {
    const event = await createEvent({
      name: "Teste galeria",
      startsAt: new Date(),
      endsAt: new Date(),
    });
    created.push(event.id);
    await transitionEvent(event.id, "active");
    return event;
  };

  const addMedia = (
    eventId: string,
    status: "ready" | "processing",
    minute: number,
    deviceId?: string,
  ) =>
    getDb()
      .insert(media)
      .values({
        eventId,
        kind: "image",
        status,
        originalKey: `events/${eventId}/original/${randomUUID()}.jpg`,
        originalMime: "image/jpeg",
        sizeBytes: 1,
        thumbKey: status === "ready" ? "thumb" : null,
        deviceId,
        createdAt: new Date(Date.UTC(2026, 11, 12, 20, minute)),
      })
      .returning()
      .then((rows) => rows[0]);

  it("hides drafts and unknown slugs", async () => {
    const event = await createEvent({ name: "Rascunho", startsAt: new Date(), endsAt: new Date() });
    created.push(event.id);
    expect(await getGuestEvent(event.slug)).toBeUndefined();
    expect(await getGuestEvent("zzzzzz")).toBeUndefined();
    await transitionEvent(event.id, "active");
    expect((await getGuestEvent(event.slug))?.id).toBe(event.id);
  });

  it("pages ready media newest first and skips media still processing", async () => {
    const event = await activeEvent();
    for (let minute = 0; minute < 5; minute++) await addMedia(event.id, "ready", minute);
    await addMedia(event.id, "processing", 10);

    const first = await listGallery(event.id, undefined, 2);
    expect(first.items.map((item) => item.createdAt.getUTCMinutes())).toEqual([4, 3]);
    const second = await listGallery(
      event.id,
      first.next ? decodeCursor(first.next) : undefined,
      2,
    );
    expect(second.items.map((item) => item.createdAt.getUTCMinutes())).toEqual([2, 1]);
    const last = await listGallery(
      event.id,
      second.next ? decodeCursor(second.next) : undefined,
      2,
    );
    expect(last.items.map((item) => item.createdAt.getUTCMinutes())).toEqual([0]);
    expect(last.next).toBeUndefined();
  });

  it("counts the ready photos and videos", async () => {
    const event = await activeEvent();
    await addMedia(event.id, "ready", 1);
    await addMedia(event.id, "ready", 2);
    await addMedia(event.id, "processing", 3);
    expect(await countGallery(event.id)).toEqual({ images: 2, videos: 0 });
  });

  it("shows a device only its own uploads that are not ready yet", async () => {
    const event = await activeEvent();
    const mine = randomUUID();
    const pending = await addMedia(event.id, "processing", 1, mine);
    await addMedia(event.id, "ready", 2, mine);
    await addMedia(event.id, "processing", 3, randomUUID());

    expect((await listOwnPending(event.id, mine)).map((item) => item.id)).toEqual([pending?.id]);
  });
});
