export type SniffedImageType = "jpeg" | "png" | "webp" | "heic";

// ISO-BMFF brands used by HEIC/HEIF photos (iPhone and many Androids). AVIF is excluded.
const HEIF_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);

/** Detects the image format from its first bytes; the declared MIME type is never trusted. */
export function sniffImageType(bytes: Uint8Array): SniffedImageType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(8, 12))) return "heic";
  return null;
}
