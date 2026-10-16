/** Redis pub/sub channel of an event; the SSE route relays it to that event's galleries. */
export function eventChannel(eventId: string): string {
  return `event:${eventId}`;
}

/** What happened to a media item. `ready` and `failed` come from the worker. */
export type RealtimeMessage =
  | { type: "media.processing"; mediaId: string }
  | { type: "media.ready"; mediaId: string }
  | { type: "media.failed"; mediaId: string }
  | { type: "media.hidden"; mediaId: string }
  | { type: "media.deleted"; mediaId: string };

const MESSAGE_TYPES = new Set<string>([
  "media.processing",
  "media.ready",
  "media.failed",
  "media.hidden",
  "media.deleted",
]);

/** Parses a published message; undefined for anything malformed. */
export function parseRealtimeMessage(raw: string): RealtimeMessage | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      "mediaId" in value &&
      typeof value.type === "string" &&
      typeof value.mediaId === "string" &&
      MESSAGE_TYPES.has(value.type)
    ) {
      return value as RealtimeMessage;
    }
  } catch {
    // Not JSON: ignored like any other malformed message.
  }
  return undefined;
}
