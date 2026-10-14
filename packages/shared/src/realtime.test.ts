import { describe, expect, it } from "vitest";
import { eventChannel, parseRealtimeMessage } from "./realtime.ts";

describe("realtime messages", () => {
  it("uses one channel per event", () => {
    expect(eventChannel("ev1")).toBe("event:ev1");
  });

  it("parses known media messages", () => {
    expect(parseRealtimeMessage('{"type":"media.ready","mediaId":"m1"}')).toEqual({
      type: "media.ready",
      mediaId: "m1",
    });
  });

  it("ignores malformed or unknown messages", () => {
    expect(parseRealtimeMessage("not json")).toBeUndefined();
    expect(parseRealtimeMessage('{"type":"media.ready"}')).toBeUndefined();
    expect(parseRealtimeMessage('{"type":"event.closed","mediaId":"m1"}')).toBeUndefined();
    expect(parseRealtimeMessage("null")).toBeUndefined();
  });
});
