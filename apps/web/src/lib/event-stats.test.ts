import { afterAll, describe, expect, it } from "vitest";
import { EMPTY_STATS, formatBytes, formatSince, totalUploads } from "./event-stats";

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [999, "999 B"],
    [3_500_000, "4 MB"],
    [450_000_000, "450 MB"],
    [4_230_000_000, "4,2 GB"],
    [1_500_000_000_000, "1,5 TB"],
  ])("%d → %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe("formatSince", () => {
  const now = new Date("2026-10-14T22:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it.each([
    [30_000, "agora"],
    [2 * 60_000, "2 min"],
    [59 * 60_000, "59 min"],
    [3 * 3_600_000, "3 h"],
    [26 * 3_600_000, "1 dia"],
    [3 * 86_400_000, "3 dias"],
  ])("%d ms ago → %s", (ms, text) => {
    expect(formatSince(ago(ms), now)).toBe(text);
  });
});

describe("totalUploads", () => {
  it("adds photos and videos", () => {
    expect(totalUploads({ ...EMPTY_STATS, images: 128, videos: 14 })).toBe(142);
  });
});

// Runs in CI against a migrated Postgres; skipped locally unless the env is set.
describe.runIf(Boolean(process.env.DATABASE_URL))("statsByEvent", async () => {
  const { eq, events, media } = await import("@kokka/db");
  const { createEvent } = await import("./events");
  const { statsByEvent } = await import("./event-stats");
  const { getDb } = await import("./db");

  const created: string[] = [];
  afterAll(async () => {
    for (const id of created) await getDb().delete(events).where(eq(events.id, id));
    await getDb().$client.end();
  });

  it("counts received media per event, distinct devices and the last upload", async () => {
    const event = await createEvent({ name: "Stats", startsAt: new Date(), endsAt: new Date() });
    const other = await createEvent({ name: "Outro", startsAt: new Date(), endsAt: new Date() });
    created.push(event.id, other.id);
    const row = (
      eventId: string,
      kind: "image" | "video",
      status: "uploading" | "processing" | "ready" | "failed" | "hidden",
      deviceId: string,
      createdAt: Date,
    ) => ({
      eventId,
      kind,
      status,
      originalKey: `test/${crypto.randomUUID()}`,
      originalMime: kind === "image" ? "image/jpeg" : "video/mp4",
      sizeBytes: 1000,
      deviceId,
      createdAt,
    });
    const last = new Date("2026-10-14T21:58:00Z");
    await getDb()
      .insert(media)
      .values([
        row(event.id, "image", "ready", "a", new Date("2026-10-14T20:00:00Z")),
        row(event.id, "image", "hidden", "a", new Date("2026-10-14T21:00:00Z")),
        row(event.id, "video", "processing", "b", last),
        // Not received: left out of every number.
        row(event.id, "image", "failed", "c", new Date("2026-10-14T23:00:00Z")),
        row(event.id, "image", "uploading", "d", new Date("2026-10-14T23:00:00Z")),
        row(other.id, "image", "ready", "z", new Date("2026-10-14T20:00:00Z")),
      ]);

    const stats = await statsByEvent();
    expect(stats.get(event.id)).toEqual({
      images: 2,
      videos: 1,
      devices: 2,
      bytes: 3000,
      lastUploadAt: last,
    });
    expect(stats.get(other.id)?.images).toBe(1);
  });
});
