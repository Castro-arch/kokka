import { guestContext, guestJson, readJson } from "@/lib/guest-api";
import { getOwnUpload, signUploadRequest } from "@/lib/uploads";

/** Presigns one S3 request of this device's upload, as asked by the Uppy S3 uploader. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/e/[slug]/uploads/[mediaId]/sign">,
) {
  return guestJson(async () => {
    const { slug, mediaId } = await ctx.params;
    const { event, deviceId } = await guestContext(slug);
    const item = await getOwnUpload(event, deviceId, mediaId);
    const signed = await signUploadRequest(item, await readJson(request));
    return Response.json(signed, { headers: { "Cache-Control": "no-store" } });
  });
}
