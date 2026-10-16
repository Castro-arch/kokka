import { InvalidMediaError } from "./errors.ts";

/** What the worker needs to know about an uploaded video. */
export interface VideoProbe {
  durationMs: number;
  /** Size as displayed, rotation applied (a portrait phone video is taller than wide). */
  width: number;
  height: number;
  hasAudio: boolean;
}

interface ProbeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  duration?: string;
  tags?: { rotate?: string };
  side_data_list?: { rotation?: number }[];
}

interface ProbeOutput {
  streams?: ProbeStream[];
  format?: { duration?: string };
}

/** Clockwise rotation a player applies: from the display matrix, else the old `rotate` tag. */
function rotationOf(stream: ProbeStream): number {
  const matrix = stream.side_data_list?.find((data) => typeof data.rotation === "number");
  // The display matrix stores the counterclockwise angle; -90 means turn 90° clockwise.
  const degrees =
    matrix?.rotation !== undefined ? -matrix.rotation : Number(stream.tags?.rotate ?? 0);
  return ((Math.round(degrees) % 360) + 360) % 360;
}

/** Parses `ffprobe -show_streams -show_format -of json`; a file without video is invalid media. */
export function parseProbe(json: string): VideoProbe {
  let output: ProbeOutput;
  try {
    output = JSON.parse(json) as ProbeOutput;
  } catch {
    throw new InvalidMediaError("O vídeo não pôde ser lido.");
  }
  const streams = output.streams ?? [];
  const video = streams.find((stream) => stream.codec_type === "video");
  if (!video?.width || !video.height) throw new InvalidMediaError("O arquivo não tem vídeo.");

  const seconds = Number(output.format?.duration ?? video.duration);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new InvalidMediaError("O vídeo não tem duração válida.");
  }

  const sideways = rotationOf(video) % 180 === 90;
  return {
    durationMs: Math.round(seconds * 1000),
    width: sideways ? video.height : video.width,
    height: sideways ? video.width : video.height,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
  };
}
