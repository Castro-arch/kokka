import { z } from "zod";
import { MAX_VIDEO_DURATION_MS, MAX_VIDEO_SIZE_BYTES, type MediaKind } from "./constants.ts";

export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 ** 2;

/** Multipart part size. S3 and R2 require at least 5 MiB for every part but the last. */
export const UPLOAD_PART_SIZE_BYTES = 10 * 1024 ** 2;

/** Guest uploads per window, counted in Redis. The IP limit is high: a venue shares one IP. */
export const UPLOAD_RATE_LIMIT = { windowSeconds: 10 * 60, perDevice: 40, perIp: 600 } as const;

/** Accepted originals. The original is stored as sent; derivatives come from the worker. */
export const UPLOAD_TYPES = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  "image/heic": { kind: "image", ext: "heic" },
  "image/heif": { kind: "image", ext: "heif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/quicktime": { kind: "video", ext: "mov" },
  "video/webm": { kind: "video", ext: "webm" },
} as const satisfies Record<string, { kind: MediaKind; ext: string }>;

export type UploadMime = keyof typeof UPLOAD_TYPES;

/** Value for `<input accept>`. */
export const UPLOAD_ACCEPT = Object.keys(UPLOAD_TYPES).join(",");

const MIME_BY_EXT: Record<string, UploadMime> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

function isUploadMime(type: string): type is UploadMime {
  return Object.hasOwn(UPLOAD_TYPES, type);
}

/**
 * The accepted MIME type of a file, from its reported type or, when the browser reports none
 * (some Android browsers do for HEIC), from the file name extension.
 */
export function resolveUploadMime(type: string, name: string): UploadMime | undefined {
  const normalized = type.trim().toLowerCase();
  if (isUploadMime(normalized)) return normalized;
  if (normalized && normalized !== "application/octet-stream") return undefined;
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return MIME_BY_EXT[ext];
}

export function maxUploadSize(kind: MediaKind): number {
  return kind === "video" ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
}

export function uploadPartCount(sizeBytes: number): number {
  return Math.max(1, Math.ceil(sizeBytes / UPLOAD_PART_SIZE_BYTES));
}

/** What a guest's browser sends to start an upload. Messages are shown to guests as is. */
export const uploadRequestSchema = z
  .object({
    name: z.string().max(255).default(""),
    type: z.string().max(100).default(""),
    size: z.number().int().positive("Arquivo vazio."),
    durationMs: z.number().int().nonnegative().optional(),
  })
  .transform((request, ctx) => {
    const mime = resolveUploadMime(request.type, request.name);
    if (!mime) {
      ctx.addIssue({
        code: "custom",
        message: "Envie fotos ou vídeos (JPEG, PNG, HEIC, MP4, MOV).",
      });
      return z.NEVER;
    }
    const { kind, ext } = UPLOAD_TYPES[mime];
    if (request.size > maxUploadSize(kind)) {
      ctx.addIssue({
        code: "custom",
        message: kind === "video" ? "Vídeos podem ter até 1 GB." : "Fotos podem ter até 50 MB.",
      });
      return z.NEVER;
    }
    if (kind === "video" && (request.durationMs ?? 0) > MAX_VIDEO_DURATION_MS) {
      ctx.addIssue({ code: "custom", message: "Vídeos podem ter até 3 minutos." });
      return z.NEVER;
    }
    return { mime, kind, ext, size: request.size, durationMs: request.durationMs };
  });

export type UploadRequest = z.infer<typeof uploadRequestSchema>;
