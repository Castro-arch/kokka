import { randomUUID } from "node:crypto";
import { storageKeys } from "@kokka/shared";
import { requireAdminApi } from "@/lib/auth-guard";
import { CoverError, processCover, readCoverUpload } from "@/lib/cover";
import { getEvent, mergeEventTheme } from "@/lib/events";
import { getStorage } from "@/lib/storage";

const READ_ONLY = "Este evento não pode mais ser editado.";

/** Replaces the event cover. The body is the raw image file. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/eventos/[id]/cover">) {
  const session = await requireAdminApi();
  if (session instanceof Response) return session;

  const { id } = await ctx.params;
  const event = await getEvent(id);
  if (!event) return errorResponse("Evento não encontrado.", 404);
  if (event.status === "expired") return errorResponse(READ_ONLY, 409);

  let cover: Uint8Array;
  try {
    cover = await processCover(await readCoverUpload(request));
  } catch (error) {
    if (error instanceof CoverError) return errorResponse(error.message, error.status);
    throw error;
  }

  // A new key per upload, so a cached signed URL never shows the previous cover.
  const key = storageKeys.cover(event.id, randomUUID());
  const storage = getStorage();
  await storage.putObject(key, cover, {
    contentType: "image/webp",
    cacheControl: "private, max-age=31536000, immutable",
  });

  if (!(await mergeEventTheme(event.id, { coverKey: key }))) {
    await storage.deleteObject(key);
    return errorResponse(READ_ONLY, 409);
  }

  const previous = event.theme.coverKey;
  if (previous && previous !== key) {
    // Best effort: an orphaned cover is removed with the rest of the event when it expires.
    await storage.deleteObject(previous).catch((error: unknown) => {
      console.error("Failed to delete previous cover", previous, error);
    });
  }

  return Response.json({ coverKey: key }, { status: 201 });
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
