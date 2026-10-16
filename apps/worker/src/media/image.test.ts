import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InvalidMediaError } from "./errors.ts";
import { deriveImage, isHeif } from "./image.ts";

/** Installed, whatever its exit code: some libheif versions exit non-zero for --version. */
function hasTool(command: string): boolean {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ENOENT";
  }
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kokka-image-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function file(name: string, data: Buffer): Promise<string> {
  const path = join(dir, name);
  await writeFile(path, data);
  return path;
}

const solid = (width: number, height: number, alpha = 1) =>
  sharp({
    create: { width, height, channels: 4, background: { r: 200, g: 40, b: 60, alpha } },
  });

describe("deriveImage", () => {
  it("turns phone photos upright and drops their metadata", async () => {
    // A landscape sensor image the phone marked "rotate 90°": displayed as portrait.
    const photo = await solid(3000, 2000)
      .jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Make: "Kokka Test" } } })
      .toBuffer();
    const result = await deriveImage(await file("photo.jpg", photo), "image/jpeg", dir);

    expect({ width: result.width, height: result.height }).toEqual({ width: 2000, height: 3000 });
    const thumb = await sharp(result.thumb).metadata();
    expect(thumb).toMatchObject({ format: "webp", width: 320, height: 480 });
    const display = await sharp(result.display).metadata();
    expect(display).toMatchObject({ format: "jpeg", width: 1365, height: 2048 });
    expect(display.exif).toBeUndefined();
    expect(display.orientation).toBeUndefined();
  });

  it("never enlarges small images", async () => {
    const small = await solid(300, 200).png().toBuffer();
    const result = await deriveImage(await file("small.png", small), "image/png", dir);
    expect(await sharp(result.thumb).metadata()).toMatchObject({ width: 300, height: 200 });
    expect(await sharp(result.display).metadata()).toMatchObject({ width: 300, height: 200 });
  });

  it("puts transparent images on white", async () => {
    const clear = await solid(10, 10, 0).png().toBuffer();
    const result = await deriveImage(await file("clear.png", clear), "image/png", dir);
    const { data } = await sharp(result.display).raw().toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255]);
  });

  it("uses the first frame of animated GIFs", async () => {
    const gif = await solid(40, 30).gif().toBuffer();
    const result = await deriveImage(await file("anim.gif", gif), "image/gif", dir);
    expect(await sharp(result.display).metadata()).toMatchObject({ format: "jpeg", width: 40 });
  });

  it("refuses files that are not images", async () => {
    const path = await file("broken.jpg", Buffer.from("definitely not a jpeg"));
    await expect(deriveImage(path, "image/jpeg", dir)).rejects.toThrow(InvalidMediaError);
  });
});

describe("isHeif", () => {
  it("knows HEIC by type or by header", async () => {
    const jpeg = await file("a.jpg", await solid(4, 4).jpeg().toBuffer());
    expect(await isHeif(jpeg, "image/heic")).toBe(true);
    expect(await isHeif(jpeg, "image/jpeg")).toBe(false);
    const header = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from("ftypheic"),
      Buffer.alloc(16),
    ]);
    expect(await isHeif(await file("b.bin", header), "application/octet-stream")).toBe(true);
  });
});

// Needs libheif-tools with an HEVC encoder and decoder (the worker image and CI install them).
describe.runIf(hasTool("heif-enc") && (hasTool("heif-dec") || hasTool("heif-convert")))(
  "HEIC photos",
  () => {
    it("decodes them through heif-dec", async () => {
      const jpeg = await file("source.jpg", await solid(640, 480).jpeg().toBuffer());
      const heic = join(dir, "photo.heic");
      execFileSync("heif-enc", [jpeg, "-o", heic]);
      const result = await deriveImage(heic, "image/heic", dir);
      expect({ width: result.width, height: result.height }).toEqual({ width: 640, height: 480 });
      expect(await sharp(result.display).metadata()).toMatchObject({ format: "jpeg" });
    });
  },
);
