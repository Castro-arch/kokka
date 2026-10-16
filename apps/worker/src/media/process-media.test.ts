import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RealtimeMessage } from "@kokka/shared";
import { UnrecoverableError } from "bullmq";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InvalidMediaError } from "./errors.ts";
import { handleMediaJob } from "./job.ts";
import {
  processMedia,
  type MediaRecord,
  type ProcessDeps,
  type ReadyFields,
} from "./process-media.ts";

const EVENT = "ev1";

function record(overrides: Partial<MediaRecord> = {}): MediaRecord {
  return {
    id: "m1",
    eventId: EVENT,
    kind: "image",
    status: "processing",
    originalKey: `events/${EVENT}/original/m1.jpg`,
    originalMime: "image/jpeg",
    ...overrides,
  };
}

/** In-memory database, storage and publisher, plus derive functions that do no real work. */
function fakes(item: MediaRecord | undefined, tmpRoot: string) {
  const objects = new Map<string, string>();
  const published: { eventId: string; message: RealtimeMessage }[] = [];
  const ready: ReadyFields[] = [];
  const state = { item, failOnUpload: false, readyAllowed: true };

  const deps: ProcessDeps = {
    tmpRoot,
    store: {
      find: (id) => Promise.resolve(state.item?.id === id ? state.item : undefined),
      markReady: (_id, fields) => {
        if (!state.readyAllowed || state.item?.status !== "processing")
          return Promise.resolve(false);
        ready.push(fields);
        state.item = { ...state.item, status: "ready" };
        return Promise.resolve(true);
      },
      markFailed: () => {
        if (state.item?.status !== "processing") return Promise.resolve(false);
        state.item = { ...state.item, status: "failed" };
        return Promise.resolve(true);
      },
    },
    storage: {
      downloadToFile: (_key, path) => writeFile(path, "original"),
      putObject: (key, _body, { contentType }) => {
        if (state.failOnUpload && contentType === "image/jpeg") {
          return Promise.reject(new Error("network down"));
        }
        objects.set(key, contentType);
        return Promise.resolve();
      },
      putFile: (key, _path, { contentType }) => {
        objects.set(key, contentType);
        return Promise.resolve();
      },
      deleteObject: (key) => {
        objects.delete(key);
        return Promise.resolve();
      },
    },
    publish: (eventId, message) => {
      published.push({ eventId, message });
      return Promise.resolve();
    },
    deriveImage: () =>
      Promise.resolve({ thumb: Buffer.from("t"), display: Buffer.from("d"), width: 4, height: 3 }),
    deriveVideo: async (_input, workDir) => {
      const displayPath = join(workDir, "display.mp4");
      await writeFile(displayPath, "mp4");
      return { thumb: Buffer.from("t"), displayPath, width: 1280, height: 720, durationMs: 42_000 };
    },
  };
  return { deps, objects, published, ready, state };
}

let tmpRoot: string;
beforeEach(async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), "kokka-jobs-"));
});
afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true });
});

describe("processMedia", () => {
  it("stores a photo's derivatives, marks it ready and tells the event", async () => {
    const { deps, objects, published, ready } = fakes(record(), tmpRoot);
    expect(await processMedia("m1", deps)).toBe("ready");
    expect(Object.fromEntries(objects)).toEqual({
      [`events/${EVENT}/thumb/m1.webp`]: "image/webp",
      [`events/${EVENT}/display/m1.jpg`]: "image/jpeg",
    });
    expect(ready).toEqual([
      {
        thumbKey: `events/${EVENT}/thumb/m1.webp`,
        displayKey: `events/${EVENT}/display/m1.jpg`,
        width: 4,
        height: 3,
        durationMs: null,
      },
    ]);
    expect(published).toEqual([
      { eventId: EVENT, message: { type: "media.ready", mediaId: "m1" } },
    ]);
    expect(await readdir(tmpRoot)).toEqual([]);
  });

  it("streams a video's display copy and keeps its duration", async () => {
    const video = record({ kind: "video", originalKey: `events/${EVENT}/original/m1.mov` });
    const { deps, objects, ready } = fakes(video, tmpRoot);
    await processMedia("m1", deps);
    expect(objects.get(`events/${EVENT}/display/m1.mp4`)).toBe("video/mp4");
    expect(ready[0]).toMatchObject({ width: 1280, height: 720, durationMs: 42_000 });
  });

  it("does nothing for media that is not processing anymore", async () => {
    for (const status of ["ready", "failed", "hidden"] as const) {
      const { deps, objects, published } = fakes(record({ status }), tmpRoot);
      expect(await processMedia("m1", deps)).toBe("skipped");
      expect(objects.size).toBe(0);
      expect(published).toEqual([]);
    }
    expect(await processMedia("gone", fakes(undefined, tmpRoot).deps)).toBe("skipped");
  });

  it("removes its files when the media changed while processing", async () => {
    const { deps, objects, published, state } = fakes(record(), tmpRoot);
    state.readyAllowed = false;
    expect(await processMedia("m1", deps)).toBe("skipped");
    expect(objects.size).toBe(0);
    expect(published).toEqual([]);
  });

  it("leaves no derivatives or temporary files after a failure", async () => {
    const { deps, objects, state } = fakes(record(), tmpRoot);
    state.failOnUpload = true;
    await expect(processMedia("m1", deps)).rejects.toThrow("network down");
    expect(objects.size).toBe(0);
    expect(await readdir(tmpRoot)).toEqual([]);
  });
});

describe("handleMediaJob", () => {
  const job = (attemptsMade: number) => ({
    data: { mediaId: "m1" },
    attemptsMade,
    opts: { attempts: 3 },
  });

  it("fails bad uploads at once, without retries", async () => {
    const { deps, published, state } = fakes(record(), tmpRoot);
    deps.deriveImage = () => Promise.reject(new InvalidMediaError("A imagem não pôde ser lida."));
    await expect(handleMediaJob(job(0), deps)).rejects.toBeInstanceOf(UnrecoverableError);
    expect(state.item?.status).toBe("failed");
    expect(published).toEqual([
      { eventId: EVENT, message: { type: "media.failed", mediaId: "m1" } },
    ]);
  });

  it("retries other errors and fails the media only on the last attempt", async () => {
    const first = fakes(record(), tmpRoot);
    first.state.failOnUpload = true;
    await expect(handleMediaJob(job(0), first.deps)).rejects.toThrow("network down");
    expect(first.state.item?.status).toBe("processing");

    const last = fakes(record(), tmpRoot);
    last.state.failOnUpload = true;
    await expect(handleMediaJob(job(2), last.deps)).rejects.toThrow("network down");
    expect(last.state.item?.status).toBe("failed");
    expect(last.published.at(-1)?.message.type).toBe("media.failed");
  });

  it("passes through successful jobs", async () => {
    const { deps } = fakes(record(), tmpRoot);
    expect(await handleMediaJob(job(0), deps)).toBe("ready");
    expect(existsSync(tmpRoot)).toBe(true);
  });
});
