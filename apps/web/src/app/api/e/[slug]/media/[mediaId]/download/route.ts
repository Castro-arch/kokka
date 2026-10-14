import { downloadName, getEventMedia, getGuestEvent } from "@/lib/guest";
import { getStorage } from "@/lib/storage";

/** Original as sent by the guest, through a short-lived signed URL that asks for a download. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/e/[slug]/media/[mediaId]/download">,
) {
  const { slug, mediaId } = await ctx.params;
  const event = await getGuestEvent(slug);
  if (!event || event.status === "expired") return notFound();

  const item = await getEventMedia(event.id, mediaId);
  if (!item || item.status === "hidden" || !item.uploadedAt) return notFound();

  const url = await getStorage().signedGetUrl(item.originalKey, 5 * 60, {
    downloadName: downloadName(event.slug, item),
  });
  return new Response(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}

function notFound() {
  return Response.json({ error: "Arquivo não encontrado." }, { status: 404 });
}
