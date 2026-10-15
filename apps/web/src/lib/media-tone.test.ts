import { describe, expect, it } from "vitest";
import { TILE_TONES, tileTone } from "./media-tone";

describe("tileTone", () => {
  it("always gives the same tone for the same id", () => {
    const id = "6f1c2c1e-6d0a-4c55-9a43-2a1f5c3e9b10";
    expect(tileTone(id)).toBe(tileTone(id));
  });

  it("spreads ids over every tone", () => {
    const seen = new Set(Array.from({ length: 200 }, () => tileTone(crypto.randomUUID())));
    expect([...seen].sort()).toEqual([...TILE_TONES].sort());
  });
});
