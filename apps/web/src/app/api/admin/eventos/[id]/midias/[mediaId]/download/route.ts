import { requireAdminApi } from "@/lib/auth-guard";
import { getEvent } from "@/lib/events";
import { downloadName, getEventMedia } from "@/lib/guest";
import { getStorage } from "@/lib/storage";

/** The admin opens it right away, so the signed link only needs to live long enough to start. */
const LINK_TTL_SECONDS = 60;

/**
 * One original, for the admin: the media must belong to the event in the URL and be ready
 * (anything else is a 404); the file comes from a short-lived signed URL that asks for a download.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/eventos/[id]/midias/[mediaId]/download">,
) {
  const session = await requireAdminApi();
  if (session instanceof Response) return session;

  const { id, mediaId } = await ctx.params;
  const event = await getEvent(id);
  if (!event) return notFound();

  const item = await getEventMedia(event.id, mediaId);
  if (item?.status !== "ready") return notFound();

  const url = await getStorage().signedGetUrl(item.originalKey, LINK_TTL_SECONDS, {
    downloadName: downloadName(event.slug, item),
  });
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "private, no-store" },
  });
}

function notFound() {
  return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
}
