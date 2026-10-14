import { afterAll, describe, expect, it, vi } from "vitest";
import { withUniqueSlug } from "./events";

function uniqueViolation(constraint: string) {
  const driverError = Object.assign(new Error("duplicate key"), {
    code: "23505",
    constraint_name: constraint,
  });
  return new Error("Failed query", { cause: driverError });
}

describe("withUniqueSlug", () => {
  it("retries with a new slug when the slug is taken", async () => {
    const slugs = ["aaaaaa", "bbbbbb"];
    const attempt = vi
      .fn<(slug: string) => Promise<string>>()
      .mockRejectedValueOnce(uniqueViolation("events_slug_idx"))
      .mockImplementation((slug) => Promise.resolve(slug));

    await expect(withUniqueSlug(attempt, () => slugs.shift() ?? "")).resolves.toBe("bbbbbb");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("rethrows other errors without retrying", async () => {
    const attempt = vi.fn().mockRejectedValue(uniqueViolation("other_idx"));
    await expect(withUniqueSlug(attempt)).rejects.toThrow("Failed query");
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("gives up after a few collisions", async () => {
    const attempt = vi.fn().mockRejectedValue(uniqueViolation("events_slug_idx"));
    await expect(withUniqueSlug(attempt)).rejects.toThrow();
    expect(attempt).toHaveBeenCalledTimes(5);
  });
});

// Runs in CI against a migrated Postgres; skipped locally unless the env is set.
describe.runIf(Boolean(process.env.DATABASE_URL))("event transitions", async () => {
  const { eq, events, media } = await import("@kokka/db");
  const {
    adminSummary,
    createEvent,
    getEvent,
    mediaCountsByEvent,
    mergeEventTheme,
    transitionEvent,
    updateEvent,
  } = await import("./events");
  const { getDb } = await import("./db");

  const created: string[] = [];
  const newEvent = async () => {
    const event = await createEvent({ name: "Teste", startsAt: new Date(), endsAt: new Date() });
    created.push(event.id);
    return event;
  };

  afterAll(async () => {
    for (const id of created) await getDb().delete(events).where(eq(events.id, id));
    await getDb().$client.end();
  });

  it("moves draft -> active -> closed and starts the retention clock", async () => {
    const { id } = await newEvent();
    expect(await transitionEvent(id, "closed")).toBeUndefined();

    expect((await transitionEvent(id, "active"))?.status).toBe("active");

    const closedAt = new Date("2026-11-22T03:00:00.000Z");
    const closed = await transitionEvent(id, "closed", closedAt);
    expect(closed).toMatchObject({ status: "closed", closedAt });
    expect(closed?.expiresAt?.toISOString()).toBe("2026-11-27T03:00:00.000Z");
  });

  it("never repeats or reverses a step", async () => {
    const { id } = await newEvent();
    await transitionEvent(id, "active");
    expect(await transitionEvent(id, "active")).toBeUndefined();
    await transitionEvent(id, "closed");
    expect(await transitionEvent(id, "active")).toBeUndefined();
    expect((await getEvent(id))?.status).toBe("closed");
  });

  it("does not edit expired events", async () => {
    const { id } = await newEvent();
    await getDb().update(events).set({ status: "expired" }).where(eq(events.id, id));
    const input = { name: "Outro", subtitle: null, startsAt: new Date(), endsAt: new Date() };
    expect(await updateEvent(id, input)).toBeUndefined();
  });

  it("merges theme changes without dropping other keys", async () => {
    const { id } = await newEvent();
    await mergeEventTheme(id, { coverKey: "events/x/cover/c.webp" });
    const event = await mergeEventTheme(id, { primaryColor: "#112233", font: "playfair" });
    expect(event?.theme).toEqual({
      coverKey: "events/x/cover/c.webp",
      primaryColor: "#112233",
      font: "playfair",
    });
  });

  it("treats malformed ids as missing", async () => {
    expect(await getEvent("not-a-uuid")).toBeUndefined();
    expect(await transitionEvent("not-a-uuid", "active")).toBeUndefined();
  });

  it("counts received photos and videos per event and today", async () => {
    const since = new Date(Date.now() - 1000);
    const event = await newEvent();
    await transitionEvent(event.id, "active");
    const add = (kind: "image" | "video", status: "processing" | "ready" | "uploading") =>
      getDb()
        .insert(media)
        .values({
          eventId: event.id,
          kind,
          status,
          originalKey: `events/${event.id}/original/${crypto.randomUUID()}.bin`,
          originalMime: kind === "video" ? "video/mp4" : "image/jpeg",
          sizeBytes: 1,
          deviceId: crypto.randomUUID(),
        });
    await add("image", "ready");
    await add("image", "processing");
    await add("video", "ready");
    await add("video", "uploading"); // not received yet

    expect((await mediaCountsByEvent()).get(event.id)).toEqual({ images: 2, videos: 1 });
    const summary = await adminSummary(since);
    expect(summary.liveEvents).toBeGreaterThanOrEqual(1);
    expect(summary.imagesToday).toBeGreaterThanOrEqual(2);
    expect(summary.videosToday).toBeGreaterThanOrEqual(1);
    expect(summary.sendersToday).toBeGreaterThanOrEqual(3);
  });
});
