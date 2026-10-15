import { describe, expect, it } from "vitest";
import { isNew, queueLabel } from "./telao-queue";

const now = new Date("2026-10-14T23:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
const item = (kind: "image" | "video", minutes: number, durationMs: number | null = null) => ({
  id: "x",
  kind,
  durationMs,
  createdAt: ago(minutes),
});

describe("isNew", () => {
  it("marks uploads from the last five minutes", () => {
    expect(isNew(item("image", 4), now)).toBe(true);
    expect(isNew(item("image", 5), now)).toBe(false);
  });
});

describe("queueLabel", () => {
  it("says when new photos arrived and how long videos are", () => {
    expect(queueLabel(item("image", 0.2), now)).toBe("Foto · chegou agora");
    expect(queueLabel(item("image", 3), now)).toBe("Foto · chegou há 3 min");
    expect(queueLabel(item("image", 12), now)).toBe("Foto · há 12 min");
    expect(queueLabel(item("video", 1, 42_000), now)).toBe("Vídeo · 0:42");
    expect(queueLabel(item("video", 1), now)).toBe("Vídeo");
  });
});
