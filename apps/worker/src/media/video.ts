import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MAX_VIDEO_DURATION_MS } from "@kokka/shared";
import sharp from "sharp";
import { InvalidMediaError } from "./errors.ts";
import { displayVideoArgs, posterArgs, probeArgs } from "./ffmpeg-args.ts";
import { THUMB_MAX_SIDE } from "./image.ts";
import { parseProbe, type VideoProbe } from "./probe.ts";
import { MissingToolError, run } from "./run.ts";

const PROBE_TIMEOUT_MS = 60_000;
/** A 3-minute 4K clip transcodes in a few minutes on one core; this only stops a stuck ffmpeg. */
const TRANSCODE_TIMEOUT_MS = 30 * 60_000;
/** Phones round the recording time; a clip a little over the limit is still accepted. */
const DURATION_TOLERANCE_MS = 2_000;

export interface VideoDerivatives {
  /** WebP poster, the gallery thumbnail. */
  thumb: Buffer;
  /** 720p H.264/AAC MP4 on disk, uploaded as a stream (it can be tens of MB). */
  displayPath: string;
  width: number;
  height: number;
  durationMs: number;
}

async function probe(path: string): Promise<VideoProbe> {
  try {
    return parseProbe(await run("ffprobe", probeArgs(path), PROBE_TIMEOUT_MS));
  } catch (error) {
    if (error instanceof InvalidMediaError || error instanceof MissingToolError) throw error;
    // ffprobe exits with an error when the file is not a media file it understands.
    throw new InvalidMediaError("O vídeo não pôde ser lido.", { cause: error });
  }
}

/**
 * Poster thumbnail and 720p display copy of an uploaded video. Videos over the 3-minute limit are
 * refused (the uploader checks too, but the browser can be bypassed).
 */
export async function deriveVideo(input: string, workDir: string): Promise<VideoDerivatives> {
  const source = await probe(input);
  if (source.durationMs > MAX_VIDEO_DURATION_MS + DURATION_TOLERANCE_MS) {
    throw new InvalidMediaError("O vídeo passa de 3 minutos.");
  }

  const displayPath = join(workDir, "display.mp4");
  const posterPath = join(workDir, "poster.png");
  await run("ffmpeg", displayVideoArgs(input, displayPath, source), TRANSCODE_TIMEOUT_MS);
  await run("ffmpeg", posterArgs(displayPath, posterPath, source.durationMs), PROBE_TIMEOUT_MS);

  const [display, thumb] = await Promise.all([
    probe(displayPath),
    sharp(await readFile(posterPath))
      .resize(THUMB_MAX_SIDE, THUMB_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
  ]);

  return {
    thumb,
    displayPath,
    width: display.width,
    height: display.height,
    durationMs: display.durationMs,
  };
}
