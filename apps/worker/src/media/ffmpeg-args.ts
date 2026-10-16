/** The display copy keeps the shorter side at most this tall (or wide, for portrait video). */
export const DISPLAY_MAX_SHORT_SIDE = 720;

// Landscape: height capped; portrait: width capped. The other side follows the aspect ratio,
// rounded to even numbers as H.264 requires. ffmpeg rotates phone videos before this filter runs.
const SHORT_SIDE = String(DISPLAY_MAX_SHORT_SIDE);
const SCALE =
  `scale=w='if(gt(iw,ih),-2,trunc(min(${SHORT_SIDE},iw)/2)*2)'` +
  `:h='if(gt(iw,ih),trunc(min(${SHORT_SIDE},ih)/2)*2,-2)'`;

const QUIET = ["-hide_banner", "-loglevel", "error", "-nostdin", "-y"];

/**
 * H.264/AAC MP4 that plays everywhere and starts before it finishes downloading (faststart).
 * Metadata is dropped: phone videos can carry the place they were shot.
 */
export function displayVideoArgs(
  input: string,
  output: string,
  { hasAudio }: { hasAudio: boolean },
): string[] {
  return [
    ...QUIET,
    "-i",
    input,
    "-map",
    "0:v:0",
    ...(hasAudio ? ["-map", "0:a:0"] : []),
    "-map_metadata",
    "-1",
    "-vf",
    SCALE,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-profile:v",
    "high",
    "-pix_fmt",
    "yuv420p",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : ["-an"]),
    "-movflags",
    "+faststart",
    output,
  ];
}

/** When the poster frame is taken: one second in, or the middle of shorter clips. */
export function posterTimeSeconds(durationMs: number): string {
  return (Math.min(1000, durationMs / 2) / 1000).toFixed(3);
}

/** One full-size frame as PNG; sharp makes the thumbnail from it. */
export function posterArgs(input: string, output: string, durationMs: number): string[] {
  return [...QUIET, "-ss", posterTimeSeconds(durationMs), "-i", input, "-frames:v", "1", output];
}

export function probeArgs(input: string): string[] {
  return ["-v", "error", "-show_streams", "-show_format", "-of", "json", input];
}
