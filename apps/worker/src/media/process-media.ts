import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { storageKeys, type MediaKind, type MediaStatus, type RealtimeMessage } from "@kokka/shared";
import { deriveImage, type ImageDerivatives } from "./image.ts";
import { deriveVideo, type VideoDerivatives } from "./video.ts";

export interface MediaRecord {
  id: string;
  eventId: string;
  kind: MediaKind;
  status: MediaStatus;
  originalKey: string;
  originalMime: string;
}

export interface ReadyFields {
  thumbKey: string;
  displayKey: string;
  width: number;
  height: number;
  durationMs: number | null;
}

/** Database access of the worker; updates only apply while the media is still processing. */
export interface MediaStore {
  find(id: string): Promise<MediaRecord | undefined>;
  markReady(id: string, fields: ReadyFields): Promise<boolean>;
  markFailed(id: string): Promise<boolean>;
}

export interface MediaStorage {
  downloadToFile(key: string, path: string): Promise<void>;
  putObject(
    key: string,
    body: Uint8Array,
    options: { contentType: string; cacheControl?: string },
  ): Promise<void>;
  putFile(
    key: string,
    path: string,
    options: { contentType: string; cacheControl?: string },
  ): Promise<void>;
  deleteObject(key: string): Promise<void>;
}

export interface ProcessDeps {
  store: MediaStore;
  storage: MediaStorage;
  publish: (eventId: string, message: RealtimeMessage) => Promise<void>;
  /** Overridable in tests. */
  deriveImage?: (input: string, mime: string, workDir: string) => Promise<ImageDerivatives>;
  deriveVideo?: (input: string, workDir: string) => Promise<VideoDerivatives>;
  tmpRoot?: string;
}

// Derivative keys never change for a media item, so caches may keep them.
const CACHE = "private, max-age=31536000, immutable";

/**
 * One media job: download the original, make the thumbnail and display copy, store them, mark the
 * media ready and tell the event's live galleries. Media no longer processing (already done,
 * deleted) is skipped, so a repeated job does nothing. A failed attempt leaves no derivatives
 * behind, and the work directory is always removed.
 */
export async function processMedia(
  mediaId: string,
  deps: ProcessDeps,
): Promise<"ready" | "skipped"> {
  const item = await deps.store.find(mediaId);
  if (item?.status !== "processing") return "skipped";

  const thumbKey = storageKeys.thumb(item.eventId, item.id);
  const displayKey = storageKeys.display(
    item.eventId,
    item.id,
    item.kind === "video" ? "mp4" : "jpg",
  );
  const workDir = await mkdtemp(join(deps.tmpRoot ?? tmpdir(), "kokka-media-"));
  const removeDerivatives = () =>
    Promise.allSettled([
      deps.storage.deleteObject(thumbKey),
      deps.storage.deleteObject(displayKey),
    ]);

  try {
    const input = join(workDir, `original${extname(item.originalKey)}`);
    await deps.storage.downloadToFile(item.originalKey, input);

    let fields: ReadyFields;
    if (item.kind === "image") {
      const image = await (deps.deriveImage ?? deriveImage)(input, item.originalMime, workDir);
      await deps.storage.putObject(thumbKey, image.thumb, {
        contentType: "image/webp",
        cacheControl: CACHE,
      });
      await deps.storage.putObject(displayKey, image.display, {
        contentType: "image/jpeg",
        cacheControl: CACHE,
      });
      fields = { thumbKey, displayKey, width: image.width, height: image.height, durationMs: null };
    } else {
      const video = await (deps.deriveVideo ?? deriveVideo)(input, workDir);
      await deps.storage.putObject(thumbKey, video.thumb, {
        contentType: "image/webp",
        cacheControl: CACHE,
      });
      await deps.storage.putFile(displayKey, video.displayPath, {
        contentType: "video/mp4",
        cacheControl: CACHE,
      });
      fields = {
        thumbKey,
        displayKey,
        width: video.width,
        height: video.height,
        durationMs: video.durationMs,
      };
    }

    if (!(await deps.store.markReady(item.id, fields))) {
      // Deleted or changed while processing: nothing should point at these files.
      await removeDerivatives();
      return "skipped";
    }
    await deps.publish(item.eventId, { type: "media.ready", mediaId: item.id });
    return "ready";
  } catch (error) {
    await removeDerivatives();
    throw error;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Gives up on a media item: marked failed, and the guest's own uploads hear about it. */
export async function failMedia(mediaId: string, deps: Pick<ProcessDeps, "store" | "publish">) {
  const item = await deps.store.find(mediaId);
  if (!item || !(await deps.store.markFailed(item.id))) return;
  await deps.publish(item.eventId, { type: "media.failed", mediaId: item.id });
}
