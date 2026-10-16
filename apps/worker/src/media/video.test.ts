import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InvalidMediaError } from "./errors.ts";
import { parseProbe } from "./probe.ts";
import { deriveVideo } from "./video.ts";

function hasFfmpeg(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** A short synthetic clip, so the test needs no fixtures in the repo. */
function makeClip(
  path: string,
  {
    size,
    seconds,
    audio,
    rotate,
  }: {
    size: string;
    seconds: number;
    audio: boolean;
    rotate?: number;
  },
) {
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `testsrc=size=${size}:rate=24:duration=${String(seconds)}`,
    ...(audio ? ["-f", "lavfi", "-i", `sine=duration=${String(seconds)}`] : []),
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    ...(audio ? ["-c:a", "aac", "-shortest"] : []),
    rotate === undefined ? path : `${path}.plain.mp4`,
  ]);
  if (rotate === undefined) return;
  // A display matrix, as phones write; the old "rotate" metadata tag is ignored by newer ffmpeg.
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-display_rotation",
    String(rotate),
    "-i",
    `${path}.plain.mp4`,
    "-c",
    "copy",
    path,
  ]);
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "kokka-video-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// ffmpeg is in the worker image and on CI; locally the test runs when it is installed.
describe.runIf(hasFfmpeg())("deriveVideo", () => {
  it("makes a 720p faststart MP4 and a poster thumbnail", async () => {
    const input = join(dir, "clip.mov");
    makeClip(input, { size: "1920x1080", seconds: 2, audio: true });
    const result = await deriveVideo(input, dir);

    expect(result).toMatchObject({ width: 1280, height: 720 });
    expect(result.durationMs).toBeGreaterThan(1500);
    const display = parseProbe(
      execFileSync("ffprobe", [
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        result.displayPath,
      ]).toString(),
    );
    expect(display.hasAudio).toBe(true);
    expect(await sharp(result.thumb).metadata()).toMatchObject({
      format: "webp",
      width: 480,
      height: 270,
    });
  });

  it("keeps portrait phone videos upright", async () => {
    const input = join(dir, "portrait.mp4");
    // Recorded sideways with a rotation flag, as phones do.
    makeClip(input, { size: "1280x720", seconds: 1, audio: false, rotate: 90 });
    const result = await deriveVideo(input, dir);
    expect(result.height).toBeGreaterThan(result.width);
    expect(result.width).toBe(720);
  });

  it("refuses videos over three minutes", async () => {
    const input = join(dir, "long.mp4");
    makeClip(input, { size: "160x90", seconds: 190, audio: false });
    await expect(deriveVideo(input, dir)).rejects.toThrow("O vídeo passa de 3 minutos.");
  });

  it("refuses files that are not videos", async () => {
    const input = join(dir, "fake.mp4");
    await writeFile(input, "not a video");
    await expect(deriveVideo(input, dir)).rejects.toThrow(InvalidMediaError);
  });
});
