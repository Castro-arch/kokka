import { requireAdminApi } from "@/lib/auth-guard";
import { getEvent } from "@/lib/events";
import { guestUrl, qrPng } from "@/lib/qr";

/** Downloads the guest QR code as a PNG large enough for any print size. */
export async function GET(_request: Request, ctx: RouteContext<"/api/admin/eventos/[id]/qr">) {
  const session = await requireAdminApi();
  if (session instanceof Response) return session;

  const { id } = await ctx.params;
  const event = await getEvent(id);
  if (!event) return Response.json({ error: "Evento não encontrado." }, { status: 404 });

  const png = await qrPng(guestUrl(event.slug), 2048);
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="kokka-qr-${event.slug}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
