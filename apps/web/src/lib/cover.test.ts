import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { COVER_MAX_BYTES, CoverError, processCover, readCoverUpload } from "./cover";

/** A landscape JPEG whose EXIF says "rotate 90° clockwise", with camera and GPS tags. */
function phonePhoto(width: number, height: number) {
  return (
    sharp({ create: { width, height, channels: 3, background: "#c2703d" } })
      .jpeg()
      .withExif({
        IFD0: { Make: "Kokka Phone" },
        IFD3: { GPSLatitudeRef: "S", GPSLatitude: "23/1 33/1 0/1" },
      })
      // sharp writes the orientation tag itself and ignores one passed to withExif.
      .withMetadata({ orientation: 6 })
      .toBuffer()
  );
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(CoverError);
  return error as CoverError;
}

describe("processCover", () => {
  it("applies the exif orientation, caps the size at 1600px and strips metadata", async () => {
    const input = await phonePhoto(3200, 2400);
    const inputMeta = await sharp(input).metadata();
    expect(inputMeta.orientation).toBe(6);
    expect(inputMeta.exif).toBeDefined();

    const output = await processCover(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([1200, 1600]);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it("does not enlarge small images", async () => {
    const input = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const meta = await sharp(await processCover(input)).metadata();
    expect([meta.width, meta.height]).toEqual([800, 600]);
  });

  it("rejects heic with a clear message", async () => {
    const heic = new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode("ftypheic"), 0, 0]);
    const error = await rejection(processCover(heic));
    expect(error.status).toBe(415);
    expect(error.message).toMatch(/HEIC/);
  });

  it("rejects other formats and corrupt images", async () => {
    expect((await rejection(processCover(new TextEncoder().encode("GIF89a....")))).status).toBe(
      415,
    );
    const truncated = (await phonePhoto(400, 300)).subarray(0, 200);
    expect((await rejection(processCover(truncated))).status).toBe(400);
  });
});

describe("readCoverUpload", () => {
  const upload = (body: BodyInit, headers: HeadersInit = {}) =>
    new Request("http://localhost/api", {
      method: "POST",
      body,
      headers,
      duplex: "half",
    } as RequestInit);

  it("reads the body", async () => {
    expect(await readCoverUpload(upload(new Uint8Array([1, 2, 3])))).toEqual(
      Buffer.from([1, 2, 3]),
    );
  });

  it("rejects a declared length over the limit without reading", async () => {
    const request = upload("x", { "content-length": String(COVER_MAX_BYTES + 1) });
    expect((await rejection(readCoverUpload(request))).status).toBe(413);
  });

  it("stops reading once the stream passes the limit", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    expect((await rejection(readCoverUpload(upload(stream)))).status).toBe(413);
    expect(sent).toBeLessThanOrEqual(COVER_MAX_BYTES + 2 * chunk.byteLength);
  });
});
