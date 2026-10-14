import "server-only";
import sharp from "sharp";
import { sniffImageType } from "./image-type";

export const COVER_MAX_BYTES = 15 * 1024 * 1024;
const COVER_MAX_SIDE = 1600;
// Rejects decompression bombs before decoding (a 48 MP phone photo is well under this).
const COVER_MAX_INPUT_PIXELS = 100_000_000;

/** A rejected upload; `message` is shown to the admin as is. */
export class CoverError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const TOO_LARGE = "A imagem passa de 15 MB. Envie uma foto menor.";

/** Reads the raw request body, stopping as soon as it exceeds the cover limit. */
export async function readCoverUpload(request: Request): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > COVER_MAX_BYTES) {
    throw new CoverError(TOO_LARGE, 413);
  }
  if (!request.body) throw new CoverError("Nenhuma imagem enviada.", 400);

  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request.body) {
    size += chunk.byteLength;
    if (size > COVER_MAX_BYTES) throw new CoverError(TOO_LARGE, 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Turns an uploaded JPEG/PNG/WebP into the cover WebP: EXIF orientation applied, at most 1600px
 * on the longest side, and no metadata (sharp drops EXIF, GPS and ICC unless asked to keep them).
 */
export async function processCover(input: Uint8Array): Promise<Uint8Array> {
  if (input.byteLength > COVER_MAX_BYTES) throw new CoverError(TOO_LARGE, 413);
  const type = sniffImageType(input);
  if (type === "heic") {
    throw new CoverError(
      "Fotos HEIC (iPhone) ainda não são aceitas como capa. Exporte como JPEG e envie de novo.",
      415,
    );
  }
  if (!type) throw new CoverError("Envie uma imagem JPEG, PNG ou WebP.", 415);

  try {
    return await sharp(input, { failOn: "error", limitInputPixels: COVER_MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: COVER_MAX_SIDE,
        height: COVER_MAX_SIDE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new CoverError("Não foi possível ler esta imagem. Tente outra foto.", 400);
  }
}
