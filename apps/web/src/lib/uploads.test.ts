import { randomUUID } from "node:crypto";
import type { Event, Media } from "@kokka/db";
import { afterAll, describe, expect, it } from "vitest";
import { startUpload, UploadError } from "./uploads";

const guest = { deviceId: randomUUID(), ip: "203.0.113.9" };

describe("startUpload refusals", () => {
  it("refuses new uploads once the event is closed", async () => {
    const closed = { status: "closed" } as Event;
    await expect(
      startUpload(closed, guest, { type: "image/jpeg", size: 10 }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("refuses files that are not photos or videos with a guest-facing message", async () => {
    const active = { status: "active" } as Event;
    const error: unknown = await startUpload(active, guest, {
      type: "application/pdf",
      size: 10,
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UploadError);
    expect(error).toMatchObject({ status: 400 });
    expect((error as Error).message).toMatch(/fotos ou vídeos/);
  });
});

// Needs the whole stack: Postgres, Redis and S3 (CI services, or the local .env).
const enabled = Boolean(
  process.env.DATABASE_URL && process.env.REDIS_URL && process.env.S3_ENDPOINT,
);

// Several round trips to hosted services per test.
describe.runIf(enabled)("guest upload flow", { timeout: 30_000 }, async () => {
  const { eq, events, media } = await import("@kokka/db");
  const { createEvent, transitionEvent } = await import("./events");
  const { abortUpload, completeUpload, getOwnUpload, signUploadRequest } =
    await import("./uploads");
  const { getMediaQueue } = await import("./media-queue");
  const { getDb } = await import("./db");
  const { getRedis } = await import("./redis");
  const { getStorage } = await import("./storage");

  const created: string[] = [];
  const keys: string[] = [];
  afterAll(async () => {
    for (const key of keys) await getStorage().deleteObject(key);
    for (const id of created) await getDb().delete(events).where(eq(events.id, id));
    await getMediaQueue().close();
    await getRedis().quit();
  });

  const activeEvent = async () => {
    const event = await createEvent({
      name: "Teste upload",
      startsAt: new Date(),
      endsAt: new Date(),
    });
    created.push(event.id);
    const active = await transitionEvent(event.id, "active");
    if (!active) throw new Error("could not activate");
    return active;
  };

  const xmlValue = (xml: string, tag: string) =>
    new RegExp(`<${tag}>([^<]+)</${tag}>`).exec(xml)?.[1] ?? "";

  /** What the Uppy S3 uploader does: ask the app to presign each request, then call S3. */
  const uploadLikeUppy = async (item: Media, body: Uint8Array<ArrayBuffer>) => {
    const key = item.originalKey;
    const create = await signUploadRequest(item, { method: "POST", key });
    const created = await fetch(create.url, { method: "POST", headers: create.headers });
    expect(created.status).toBe(200);
    const uploadId = xmlValue(await created.text(), "UploadId");

    const part = await signUploadRequest(item, { method: "PUT", key, uploadId, partNumber: 1 });
    const stored = await fetch(part.url, { method: "PUT", body });
    expect(stored.status).toBe(200);
    const etag = stored.headers.get("etag") ?? "";

    const complete = await signUploadRequest(item, { method: "POST", key, uploadId });
    const done = await fetch(complete.url, {
      method: "POST",
      body: `<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>${etag}</ETag></Part></CompleteMultipartUpload>`,
    });
    expect(done.status).toBe(200);
    await done.text();
    return uploadId;
  };

  it("stores the original, marks it processing and enqueues it for the worker", async () => {
    const event = await activeEvent();
    const bytes = new Uint8Array(1234).fill(7);
    const start = await startUpload(event, guest, {
      name: "foto.jpg",
      type: "image/jpeg",
      size: bytes.length,
    });
    keys.push(start.key);
    expect(start.key).toBe(`events/${event.id}/original/${start.mediaId}.jpg`);

    const item = await getOwnUpload(event, guest.deviceId, start.mediaId);
    await uploadLikeUppy(item, bytes);
    await completeUpload(event, await getOwnUpload(event, guest.deviceId, start.mediaId));

    const [row] = await getDb().select().from(media).where(eq(media.id, start.mediaId));
    expect(row).toMatchObject({ status: "processing", uploadId: null, deviceId: guest.deviceId });
    expect(row?.uploadedAt).toBeInstanceOf(Date);
    expect(await getStorage().headObject(start.key)).toEqual({
      size: bytes.length,
      contentType: "image/jpeg",
    });

    const job = await getMediaQueue().getJob(start.mediaId);
    expect(job?.data).toEqual({ mediaId: start.mediaId });
    await job?.remove();

    // Finished uploads cannot be signed, completed or aborted again.
    await expect(getOwnUpload(event, guest.deviceId, start.mediaId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("signs only this upload's own requests, for the device that started it", async () => {
    const event = await activeEvent();
    const start = await startUpload(event, guest, { type: "video/mp4", size: 10, durationMs: 1 });
    await expect(getOwnUpload(event, randomUUID(), start.mediaId)).rejects.toMatchObject({
      status: 404,
    });

    const item = await getOwnUpload(event, guest.deviceId, start.mediaId);
    const refused = [
      { method: "POST", key: `events/${event.id}/original/${randomUUID()}.mp4` }, // other key
      { method: "PUT", key: start.key }, // single PUT, not multipart
      { method: "DELETE", key: start.key }, // object delete
      { method: "PUT", key: start.key, uploadId: "u", partNumber: 2 }, // more parts than declared
      { method: "PATCH", key: start.key },
    ];
    for (const request of refused) {
      await expect(signUploadRequest(item, request)).rejects.toMatchObject({ status: 400 });
    }

    // A signed request records the upload id, so the upload can be aborted later.
    await signUploadRequest(item, { method: "GET", key: start.key, uploadId: "up-1" });
    const recorded = await getOwnUpload(event, guest.deviceId, start.mediaId);
    expect(recorded.uploadId).toBe("up-1");
    await abortUpload(recorded);
    expect(await getDb().select().from(media).where(eq(media.id, start.mediaId))).toEqual([]);
  });

  it("fails an upload whose size differs from the declared one", async () => {
    const event = await activeEvent();
    const start = await startUpload(event, guest, { type: "image/png", size: 100 });
    const item = await getOwnUpload(event, guest.deviceId, start.mediaId);
    await expect(completeUpload(event, item)).rejects.toMatchObject({ status: 409 });

    await uploadLikeUppy(item, new Uint8Array(50));
    await expect(completeUpload(event, item)).rejects.toMatchObject({ status: 422 });
    const [row] = await getDb().select().from(media).where(eq(media.id, start.mediaId));
    expect(row?.status).toBe("failed");
    expect(await getStorage().headObject(start.key)).toBeUndefined();
  });

  it("lets an upload started before closing finish, but not new ones", async () => {
    const event = await activeEvent();
    const start = await startUpload(event, guest, { type: "image/jpeg", size: 10 });
    const closed = await transitionEvent(event.id, "closed");
    if (!closed) throw new Error("could not close");

    await expect(getOwnUpload(closed, guest.deviceId, start.mediaId)).resolves.toBeDefined();
    await expect(
      startUpload(closed, guest, { type: "image/jpeg", size: 10 }),
    ).rejects.toMatchObject({ status: 403 });
    await abortUpload(await getOwnUpload(closed, guest.deviceId, start.mediaId));
  });
});
