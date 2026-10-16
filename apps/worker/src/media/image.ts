import { open, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { InvalidMediaError } from "./errors.ts";
import { run } from "./run.ts";

/** Gallery thumbnail: WebP, longest side. */
export const THUMB_MAX_SIDE = 480;
/** Display copy: JPEG, longest side, enough for a big screen. */
export const DISPLAY_MAX_SIDE = 2048;

/** Larger images are refused instead of exhausting the worker's memory (about 100 MP). */
const MAX_INPUT_PIXELS = 100_000_000;
const HEIF_TIMEOUT_MS = 2 * 60_000;

export interface ImageDerivatives {
  thumb: Buffer;
  display: Buffer;
  /** Size of the original as displayed (EXIF orientation applied). */
  width: number;
  height: number;
}

const HEIF_MIMES = new Set(["image/heic", "image/heif"]);
// ISO-BMFF brands used by HEIC/HEIF photos (iPhone and many Androids). AVIF is excluded.
const HEIF_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);

/** HEIC by its MIME type or, since some phones send none, by the file's own header. */
export async function isHeif(path: string, mime: string): Promise<boolean> {
  if (HEIF_MIMES.has(mime)) return true;
  const file = await open(path, "r");
  try {
    const { buffer, bytesRead } = await file.read(Buffer.alloc(12), 0, 12, 0);
    if (bytesRead < 12) return false;
    return (
      buffer.toString("latin1", 4, 8) === "ftyp" &&
      HEIF_BRANDS.has(buffer.toString("latin1", 8, 12))
    );
  } finally {
    await file.close();
  }
}

/**
 * The prebuilt sharp cannot decode HEVC, so HEIC goes through `heif-dec` (libheif + libde265,
 * from libheif-tools) into a PNG first. Older libheif writes `name-1.png` for files with several
 * images; the first one is the primary.
 */
async function decodeHeif(input: string, workDir: string): Promise<string> {
  const output = join(workDir, "decoded.png");
  await run("heif-dec", [input, output], HEIF_TIMEOUT_MS).catch((error: unknown) => {
    if (error instanceof Error && error.name === "MissingToolError") throw error;
    throw new InvalidMediaError("A foto HEIC não pôde ser lida.", { cause: error });
  });
  const decoded = (await readdir(workDir))
    .filter((name) => /^decoded(-\d+)?\.png$/.test(name))
    .sort();
  const first = decoded[0];
  if (!first) throw new InvalidMediaError("A foto HEIC não tem imagem.");
  return join(workDir, first);
}

/** EXIF orientations 5–8 turn the picture sideways. */
const sideways = (orientation: number | undefined) => orientation !== undefined && orientation >= 5;

/**
 * Thumbnail and display copy of an uploaded photo. The original is never touched: these are new
 * files, turned upright, in sRGB, without metadata (no GPS), and transparent areas become white.
 * Animated GIFs use their first frame.
 */
export async function deriveImage(
  input: string,
  mime: string,
  workDir: string,
): Promise<ImageDerivatives> {
  const path = (await isHeif(input, mime)) ? await decodeHeif(input, workDir) : input;
  // From memory, not the path: libvips would keep the file open (Windows then cannot delete the
  // work dir). Photos are at most 50 MB.
  const source = await readFile(path);
  try {
    const meta = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!meta.width || !meta.height) throw new InvalidMediaError("A imagem não tem tamanho.");

    const upright = sharp(source, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
      animated: false,
    })
      .rotate()
      .flatten({ background: "#ffffff" });

    const [thumb, display] = await Promise.all([
      upright
        .clone()
        .resize(THUMB_MAX_SIDE, THUMB_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
      upright
        .clone()
        .resize(DISPLAY_MAX_SIDE, DISPLAY_MAX_SIDE, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer(),
    ]);

    const turned = sideways(meta.orientation);
    return {
      thumb,
      display,
      width: turned ? meta.height : meta.width,
      height: turned ? meta.width : meta.height,
    };
  } catch (error) {
    if (error instanceof InvalidMediaError) throw error;
    // sharp only fails here on the file itself: unsupported, truncated or too large.
    throw new InvalidMediaError("A imagem não pôde ser lida.", { cause: error });
  }
}
