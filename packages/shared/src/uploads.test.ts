import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_SIZE_BYTES,
  resolveUploadMime,
  UPLOAD_PART_SIZE_BYTES,
  uploadPartCount,
  uploadPartSize,
  uploadRequestSchema,
} from "./uploads.ts";

const firstError = (input: unknown) =>
  uploadRequestSchema.safeParse(input).error?.issues[0]?.message;

describe("resolveUploadMime", () => {
  it("uses the reported type when it is accepted", () => {
    expect(resolveUploadMime("image/JPEG", "foto.png")).toBe("image/jpeg");
  });

  it("falls back to the extension when the browser reports no type", () => {
    expect(resolveUploadMime("", "IMG_0001.HEIC")).toBe("image/heic");
    expect(resolveUploadMime("application/octet-stream", "clip.mov")).toBe("video/quicktime");
  });

  it("rejects other reported types even with a media extension", () => {
    expect(resolveUploadMime("application/pdf", "foto.jpg")).toBeUndefined();
    expect(resolveUploadMime("", "notas.txt")).toBeUndefined();
  });
});

describe("uploadRequestSchema", () => {
  it("accepts a photo and resolves kind and extension", () => {
    expect(
      uploadRequestSchema.parse({ name: "a.jpg", type: "image/jpeg", size: 2_000_000 }),
    ).toEqual({
      mime: "image/jpeg",
      kind: "image",
      ext: "jpg",
      size: 2_000_000,
      durationMs: undefined,
    });
  });

  it("accepts a 3 minute video", () => {
    const parsed = uploadRequestSchema.parse({
      type: "video/mp4",
      size: 500_000_000,
      durationMs: 180_000,
    });
    expect(parsed.kind).toBe("video");
  });

  it("explains each refusal in portuguese", () => {
    expect(firstError({ type: "application/pdf", size: 10 })).toMatch(/fotos ou vídeos/);
    expect(firstError({ type: "image/png", size: MAX_IMAGE_SIZE_BYTES + 1 })).toMatch(/50 MB/);
    expect(firstError({ type: "video/mp4", size: 1024 ** 3 + 1 })).toMatch(/1 GB/);
    expect(firstError({ type: "video/mp4", size: 10, durationMs: 180_001 })).toMatch(/3 minutos/);
    expect(firstError({ type: "image/png", size: 0 })).toMatch(/vazio/);
  });
});

describe("uploadPartSize", () => {
  it("is the full part size until the last part, which takes the rest", () => {
    const size = 2 * UPLOAD_PART_SIZE_BYTES + 123;
    expect(uploadPartSize(size, 1)).toBe(UPLOAD_PART_SIZE_BYTES);
    expect(uploadPartSize(size, 2)).toBe(UPLOAD_PART_SIZE_BYTES);
    expect(uploadPartSize(size, 3)).toBe(123);
    expect(uploadPartSize(10, 1)).toBe(10);
  });

  it("refuses parts beyond the declared size", () => {
    expect(() => uploadPartSize(10, 2)).toThrow(RangeError);
    expect(() => uploadPartSize(10, 0)).toThrow(RangeError);
  });
});

describe("uploadPartCount", () => {
  it("needs one part for small files and rounds up the rest", () => {
    expect(uploadPartCount(1)).toBe(1);
    expect(uploadPartCount(UPLOAD_PART_SIZE_BYTES)).toBe(1);
    expect(uploadPartCount(UPLOAD_PART_SIZE_BYTES + 1)).toBe(2);
  });
});
