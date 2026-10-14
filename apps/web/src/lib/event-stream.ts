import "server-only";
import { parseRealtimeMessage } from "@kokka/shared";

/** The part of an ioredis subscriber connection the stream uses. */
export interface Subscriber {
  subscribe(channel: string): Promise<unknown>;
  on(event: "message", listener: (channel: string, message: string) => void): unknown;
  quit(): Promise<unknown>;
}

/** What a gallery needs to show a newly ready item. */
export interface ReadyItem {
  id: string;
  kind: "image" | "video";
  thumbUrl: string;
  downloadUrl: string;
}

export interface EventStreamOptions {
  channel: string;
  subscriber: Subscriber;
  /** The ready item for a media id, or undefined if it is not ready (or not of this event). */
  readyItem: (mediaId: string) => Promise<ReadyItem | undefined>;
  signal: AbortSignal;
  heartbeatMs?: number;
}

const HEARTBEAT_MS = 25_000;

/**
 * Server-sent events for one gallery: `ready` with the item to insert, `removed` with the id of a
 * hidden or deleted item. Comments keep proxies from closing an idle connection. The Redis
 * subscription ends when the browser goes away.
 */
export function createEventStream(options: EventStreamOptions): ReadableStream<Uint8Array> {
  const { channel, subscriber, readyItem, signal } = options;
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  return new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        void subscriber.quit().catch(() => undefined);
        controller.close();
      };

      signal.addEventListener("abort", close, { once: true });
      subscriber.on("message", (_channel, raw) => {
        const message = parseRealtimeMessage(raw);
        if (!message) return;
        if (message.type === "media.ready") {
          void readyItem(message.mediaId).then((item) => {
            if (item) send(`event: ready\ndata: ${JSON.stringify(item)}\n\n`);
          });
        } else if (message.type === "media.hidden" || message.type === "media.deleted") {
          send(`event: removed\ndata: ${JSON.stringify({ id: message.mediaId })}\n\n`);
        }
      });

      await subscriber.subscribe(channel);
      // Tells EventSource to wait 5 s before reconnecting after a drop.
      send("retry: 5000\n\n");
      heartbeat = setInterval(() => {
        send(": ping\n\n");
      }, options.heartbeatMs ?? HEARTBEAT_MS);
      if (signal.aborted) close();
    },
    cancel() {
      clearInterval(heartbeat);
      void subscriber.quit().catch(() => undefined);
    },
  });
}
