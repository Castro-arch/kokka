import { afterAll, describe, expect, it } from "vitest";

// Runs in CI against a migrated Postgres; skipped locally unless the env is set.
describe.runIf(Boolean(process.env.DATABASE_URL))("media store", async () => {
  const { createDb, eq, events, media } = await import("@kokka/db");
  const { createMediaStore } = await import("./store.ts");
  const db = createDb(process.env.DATABASE_URL ?? "", { max: 1 });
  const store = createMediaStore(db);
  const created: string[] = [];

  afterAll(async () => {
    for (const id of created) await db.delete(events).where(eq(events.id, id));
    await db.$client.end();
  });

  async function processingMedia() {
    const [event] = await db
      .insert(events)
      .values({ slug: crypto.randomUUID().slice(0, 6), name: "Worker" })
      .returning({ id: events.id });
    if (!event) throw new Error("no event");
    created.push(event.id);
    const [item] = await db
      .insert(media)
      .values({
        eventId: event.id,
        kind: "image",
        status: "processing",
        originalKey: `events/${event.id}/original/x.jpg`,
        originalMime: "image/jpeg",
        sizeBytes: 1,
      })
      .returning({ id: media.id });
    if (!item) throw new Error("no media");
    return item.id;
  }

  const fields = {
    thumbKey: "t.webp",
    displayKey: "d.jpg",
    width: 4,
    height: 3,
    durationMs: null,
  };

  it("marks processing media ready, once", async () => {
    const id = await processingMedia();
    expect(await store.markReady(id, fields)).toBe(true);
    expect(await store.find(id)).toMatchObject({ status: "ready" });
    expect(await store.markReady(id, fields)).toBe(false);
    expect(await store.markFailed(id)).toBe(false);
  });

  it("marks processing media failed", async () => {
    const id = await processingMedia();
    expect(await store.markFailed(id)).toBe(true);
    expect(await store.find(id)).toMatchObject({ status: "failed" });
  });
});
