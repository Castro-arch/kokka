import { clientIp } from "@/lib/device";
import { guestContext, guestJson, readJson } from "@/lib/guest-api";
import { startUpload } from "@/lib/uploads";

/** Starts a guest upload: validates the file, checks the rate limit and opens a multipart upload. */
export async function POST(request: Request, ctx: RouteContext<"/api/e/[slug]/uploads">) {
  return guestJson(async () => {
    const { event, deviceId } = await guestContext((await ctx.params).slug);
    const ip = clientIp(request.headers);
    const upload = await startUpload(event, { deviceId, ip }, await readJson(request));
    return Response.json(upload, { status: 201 });
  });
}
