import { eventChannel } from "@kokka/shared";
import { createEventStream } from "@/lib/event-stream";
import { getEventMedia, getGuestEvent } from "@/lib/guest";
import { getRedis } from "@/lib/redis";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Live gallery updates (server-sent events) for one event. */
export async function GET(request: Request, ctx: RouteContext<"/api/e/[slug]/stream">) {
  const event = await getGuestEvent((await ctx.params).slug);
  if (!event || event.status === "expired") {
    return Response.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  const stream = createEventStream({
    channel: eventChannel(event.id),
    // Subscribing takes over a Redis connection, so each stream gets its own.
    subscriber: getRedis().duplicate(),
    signal: request.signal,
    readyItem: async (mediaId) => {
      const item = await getEventMedia(event.id, mediaId);
      if (item?.status !== "ready" || !item.thumbKey) return undefined;
      return {
        id: item.id,
        kind: item.kind,
        thumbUrl: await getStorage().signedGetUrl(item.thumbKey),
        downloadUrl: `/api/e/${event.slug}/media/${item.id}/download`,
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx/Traefik-style proxies must not buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
