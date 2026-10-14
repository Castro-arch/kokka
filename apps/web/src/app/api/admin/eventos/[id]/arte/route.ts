import { requireAdminApi } from "@/lib/auth-guard";
import { resolveTheme } from "@/lib/event-display";
import { getEvent } from "@/lib/events";
import { renderPrintCard } from "@/lib/print-card";
import { guestUrl } from "@/lib/qr";

/** The A6 table card as a 300 dpi PNG; `?download=1` saves it instead of showing it. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/eventos/[id]/arte">) {
  const session = await requireAdminApi();
  if (session instanceof Response) return session;

  const { id } = await ctx.params;
  const event = await getEvent(id);
  if (!event) return Response.json({ error: "Evento não encontrado." }, { status: 404 });

  const png = await renderPrintCard({
    name: event.name,
    subtitle: event.subtitle,
    ...resolveTheme(event.theme),
    url: guestUrl(event.slug),
  });
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="kokka-arte-${event.slug}.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
