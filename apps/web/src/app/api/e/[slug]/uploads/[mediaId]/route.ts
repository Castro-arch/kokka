import { guestContext, guestJson } from "@/lib/guest-api";
import { abortUpload, getOwnUpload } from "@/lib/uploads";

/** Cancels an unfinished upload of this device. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/e/[slug]/uploads/[mediaId]">,
) {
  return guestJson(async () => {
    const { slug, mediaId } = await ctx.params;
    const { event, deviceId } = await guestContext(slug);
    await abortUpload(await getOwnUpload(event, deviceId, mediaId));
    return new Response(null, { status: 204 });
  });
}
