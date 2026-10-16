import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ signedIn: true }));

vi.mock("@/lib/auth-guard", () => ({
  requireAdminApi: () =>
    Promise.resolve(
      session.signedIn ? { user: { id: "admin" } } : Response.json({}, { status: 401 }),
    ),
}));

vi.mock("@/lib/storage", () => ({
  getStorage: () => ({
    signedGetUrl: (key: string, ttl: number) =>
      Promise.resolve(`https://storage.test/${key}?ttl=${String(ttl)}`),
  }),
}));

// Runs in CI against a migrated Postgres; skipped locally unless the env is set.
describe.runIf(Boolean(process.env.DATABASE_URL))("admin media download", async () => {
  const { eq, events, media } = await import("@kokka/db");
  const { createEvent } = await import("@/lib/events");
  const { getDb } = await import("@/lib/db");
  const { GET } = await import("./route");

  const created: string[] = [];
  afterAll(async () => {
    for (const id of created) await getDb().delete(events).where(eq(events.id, id));
    await getDb().$client.end();
  });

  async function eventWithMedia(status: "ready" | "processing" | "hidden") {
    const event = await createEvent({ name: "Download", startsAt: new Date(), endsAt: new Date() });
    created.push(event.id);
    const [item] = await getDb()
      .insert(media)
      .values({
        eventId: event.id,
        kind: "image",
        status,
        originalKey: `events/${event.id}/original/${crypto.randomUUID()}.jpg`,
        originalMime: "image/jpeg",
        sizeBytes: 1,
      })
      .returning();
    if (!item) throw new Error("no media");
    return { event, item };
  }

  const get = (eventId: string, mediaId: string) =>
    GET(new Request("http://test/download"), {
      params: Promise.resolve({ id: eventId, mediaId }),
    });

  beforeEach(() => {
    session.signedIn = true;
  });

  it("redirects to a short-lived signed URL of the original", async () => {
    const { event, item } = await eventWithMedia("ready");
    const response = await get(event.id, item.id);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `https://storage.test/${item.originalKey}?ttl=60`,
    );
  });

  it("does not serve media of another event", async () => {
    const { event } = await eventWithMedia("ready");
    const other = await eventWithMedia("ready");
    expect((await get(event.id, other.item.id)).status).toBe(404);
  });

  it("only serves ready media", async () => {
    for (const status of ["processing", "hidden"] as const) {
      const { event, item } = await eventWithMedia(status);
      expect((await get(event.id, item.id)).status).toBe(404);
    }
  });

  it("404s on malformed ids and 401s without a session", async () => {
    const { event, item } = await eventWithMedia("ready");
    expect((await get("nope", item.id)).status).toBe(404);
    expect((await get(event.id, "nope")).status).toBe(404);
    session.signedIn = false;
    expect((await get(event.id, item.id)).status).toBe(401);
  });
});
