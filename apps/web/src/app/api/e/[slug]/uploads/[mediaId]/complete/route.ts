import { guestContext, guestJson } from "@/lib/guest-api";
import { completeUpload, getOwnUpload } from "@/lib/uploads";

/** The uploader finished: checks the stored original and hands it to the worker. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/e/[slug]/uploads/[mediaId]/complete">,
) {
  return guestJson(async () => {
    const { slug, mediaId } = await ctx.params;
    const { event, deviceId } = await guestContext(slug);
    const item = await getOwnUpload(event, deviceId, mediaId);
    await completeUpload(event, item);
    return Response.json({ mediaId: item.id, status: "processing" });
  });
}
