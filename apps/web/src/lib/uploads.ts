import "server-only";
import { and, eq, media, type Event, type Media } from "@kokka/db";
import { storageKeys, uploadPartCount, uploadRequestSchema } from "@kokka/shared";
import type { MultipartRequest } from "@kokka/shared/storage";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "./db";
import { enqueueMediaProcessing, publishToEvent } from "./media-queue";
import { allowGuestUpload } from "./rate-limit";
import { getRedis } from "./redis";
import { getStorage } from "./storage";

/** Refusal shown to the guest as is. */
export class UploadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const CLOSED = "Os envios deste evento foram encerrados.";
const NOT_FOUND = "Envio não encontrado. Tente de novo.";
const BAD_REQUEST = "Pedido de envio inválido.";

/** New uploads only while the event is active. */
function assertAcceptingUploads(event: Event): void {
  if (event.status !== "active") throw new UploadError(CLOSED, 403);
}

/**
 * Uploads already under way when the admin closes the event may still finish, so a big video
 * started in time is not lost.
 */
function assertUploadOpen(event: Event, item: Media): void {
  const startedBeforeClose =
    event.status === "closed" && event.closedAt !== null && item.createdAt <= event.closedAt;
  if (event.status !== "active" && !startedBeforeClose) throw new UploadError(CLOSED, 403);
}

/**
 * Registers a guest upload after checking the file and the rate limit. The browser then runs the
 * multipart upload itself, asking `signUploadRequest` to presign each S3 request for this key.
 */
export async function startUpload(
  event: Event,
  guest: { deviceId: string; ip: string },
  body: unknown,
): Promise<{ mediaId: string; key: string }> {
  assertAcceptingUploads(event);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new UploadError(parsed.error.issues[0]?.message ?? "Arquivo inválido.", 400);
  }
  if (!(await allowGuestUpload(getRedis(), guest))) {
    throw new UploadError(
      "Muitos envios em pouco tempo. Espere alguns minutos e tente de novo.",
      429,
    );
  }

  const { mime, kind, ext, size, durationMs } = parsed.data;
  const mediaId = randomUUID();
  const key = storageKeys.original(event.id, mediaId, ext);
  await getDb().insert(media).values({
    id: mediaId,
    eventId: event.id,
    kind,
    status: "uploading",
    originalKey: key,
    originalMime: mime,
    sizeBytes: size,
    durationMs,
    deviceId: guest.deviceId,
    // App clock, like the event's closed_at, so "started before closing" compares one clock.
    createdAt: new Date(),
  });
  return { mediaId, key };
}

/** The upload this device started on this event and has not finished yet. */
export async function getOwnUpload(
  event: Event,
  deviceId: string,
  mediaId: string,
): Promise<Media> {
  if (!z.uuid().safeParse(mediaId).success) throw new UploadError(NOT_FOUND, 404);
  const [item] = await getDb()
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.eventId, event.id), eq(media.deviceId, deviceId)));
  if (item?.status !== "uploading") throw new UploadError(NOT_FOUND, 404);
  assertUploadOpen(event, item);
  return item;
}

/** What the Uppy S3 uploader asks to presign (its `PresignableRequest`). */
const uppyRequestSchema = z.object({
  method: z.enum(["GET", "PUT", "POST", "DELETE"]),
  key: z.string(),
  uploadId: z.string().min(1).max(1024).optional(),
  partNumber: z.number().int().optional(),
});

/** Maps an uploader request to the only S3 operations a guest upload may perform. */
function toMultipartRequest(item: Media, body: unknown): MultipartRequest {
  const parsed = uppyRequestSchema.safeParse(body);
  if (!parsed.success || parsed.data.key !== item.originalKey) {
    throw new UploadError(BAD_REQUEST, 400);
  }
  const { method, key, uploadId, partNumber } = parsed.data;

  if (!uploadId) {
    // Single PUTs and object deletes are never signed: originals always go multipart.
    if (method !== "POST") throw new UploadError(BAD_REQUEST, 400);
    return { op: "create", key, contentType: item.originalMime };
  }
  switch (method) {
    case "PUT":
      if (
        partNumber === undefined ||
        partNumber < 1 ||
        partNumber > uploadPartCount(item.sizeBytes)
      ) {
        throw new UploadError(BAD_REQUEST, 400);
      }
      return { op: "uploadPart", key, uploadId, partNumber };
    case "GET":
      return { op: "listParts", key, uploadId };
    case "POST":
      return { op: "complete", key, uploadId };
    case "DELETE":
      return { op: "abort", key, uploadId };
  }
}

/**
 * Presigns one request of this upload. Only this media's key, at most the parts its declared size
 * needs, and the original's own content type. The latest upload id is kept so an abandoned
 * upload can be aborted later.
 */
export async function signUploadRequest(
  item: Media,
  body: unknown,
): Promise<{ url: string; headers?: Record<string, string> }> {
  const request = toMultipartRequest(item, body);
  if (request.op !== "create" && request.uploadId !== item.uploadId) {
    await getDb()
      .update(media)
      .set({ uploadId: request.uploadId })
      .where(and(eq(media.id, item.id), eq(media.status, "uploading")));
  }
  const url = await getStorage().presignMultipartRequest(request);
  return request.op === "create"
    ? { url, headers: { "Content-Type": request.contentType } }
    : { url };
}

/**
 * Called by the browser once the uploader completed the multipart upload: checks the stored
 * original has the declared size and hands it to the worker. A size mismatch deletes the object
 * and marks the upload failed.
 */
export async function completeUpload(event: Event, item: Media): Promise<void> {
  const storage = getStorage();
  const stored = await storage.headObject(item.originalKey);
  if (!stored) throw new UploadError("O envio ainda não terminou.", 409);
  if (stored.size !== item.sizeBytes) {
    await storage.deleteObject(item.originalKey);
    await getDb()
      .update(media)
      .set({ status: "failed", uploadId: null })
      .where(eq(media.id, item.id));
    throw new UploadError("O arquivo chegou incompleto. Tente de novo.", 422);
  }

  // Conditional on still uploading, so a repeated "complete" never enqueues twice.
  const [done] = await getDb()
    .update(media)
    .set({ status: "processing", uploadId: null, uploadedAt: new Date() })
    .where(and(eq(media.id, item.id), eq(media.status, "uploading")))
    .returning({ id: media.id });
  if (!done) return;

  await enqueueMediaProcessing(item.id);
  await publishToEvent(event.id, { type: "media.processing", mediaId: item.id });
}

/** The guest gave up (or removed the file): drop the stored parts, if any, and the record. */
export async function abortUpload(item: Media): Promise<void> {
  if (item.uploadId) {
    // The uploader may have aborted it already; an unknown upload is fine here.
    await getStorage()
      .abortMultipartUpload(item.originalKey, item.uploadId)
      .catch(() => undefined);
  }
  await getDb().delete(media).where(eq(media.id, item.id));
}
