import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createEventStream, type ReadyItem, type Subscriber } from "./event-stream";

function fakeSubscriber() {
  const emitter = new EventEmitter();
  const subscriber = {
    subscribe: vi.fn(() => Promise.resolve(1)),
    on: (event: "message", listener: (channel: string, message: string) => void) =>
      emitter.on(event, listener),
    quit: vi.fn(() => Promise.resolve("OK")),
  } satisfies Subscriber;
  const publish = (message: unknown) =>
    emitter.emit(
      "message",
      "event:e1",
      typeof message === "string" ? message : JSON.stringify(message),
    );
  return { subscriber, publish };
}

const ready: ReadyItem = {
  id: "m1",
  kind: "image",
  thumbUrl: "https://s3/thumb",
  downloadUrl: "/d",
};

async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, text: string) {
  const decoder = new TextDecoder();
  let received = "";
  while (!received.includes(text)) {
    const { value, done } = await reader.read();
    if (done) break;
    received += decoder.decode(value);
  }
  return received;
}

describe("createEventStream", () => {
  it("relays ready, removed and failed media and ignores the rest", async () => {
    const { subscriber, publish } = fakeSubscriber();
    const readyItem = vi.fn((id: string) => Promise.resolve(id === "m1" ? ready : undefined));
    const abort = new AbortController();
    const reader = createEventStream({
      channel: "event:e1",
      subscriber,
      readyItem,
      signal: abort.signal,
    }).getReader();

    expect(await readUntil(reader, "retry: 5000")).toContain("retry: 5000");
    expect(subscriber.subscribe).toHaveBeenCalledWith("event:e1");

    publish("not json");
    publish({ type: "media.processing", mediaId: "m1" });
    publish({ type: "media.ready", mediaId: "unknown" });
    publish({ type: "media.ready", mediaId: "m1" });
    expect(await readUntil(reader, "event: ready")).toBe(
      `event: ready\ndata: ${JSON.stringify(ready)}\n\n`,
    );

    publish({ type: "media.hidden", mediaId: "m2" });
    expect(await readUntil(reader, "removed")).toBe('event: removed\ndata: {"id":"m2"}\n\n');

    publish({ type: "media.failed", mediaId: "m3" });
    expect(await readUntil(reader, "failed")).toBe('event: failed\ndata: {"id":"m3"}\n\n');

    abort.abort();
    expect(await reader.read()).toEqual({ done: true, value: undefined });
    expect(subscriber.quit).toHaveBeenCalled();
  });

  it("sends heartbeats so idle connections stay open", async () => {
    const { subscriber } = fakeSubscriber();
    const abort = new AbortController();
    const reader = createEventStream({
      channel: "event:e1",
      subscriber,
      readyItem: () => Promise.resolve(undefined),
      signal: abort.signal,
      heartbeatMs: 10,
    }).getReader();

    expect(await readUntil(reader, ": ping")).toContain(": ping\n\n");
    abort.abort();
  });
});
