import { describe, expect, it } from "vitest";
import { darken, lighten, readableTextColor } from "./color";

describe("readableTextColor", () => {
  it("uses white on dark and saturated colors", () => {
    expect(readableTextColor("#000000")).toBe("#ffffff");
    expect(readableTextColor("#1f4e79")).toBe("#ffffff");
    expect(readableTextColor("#c2703d")).toBe("#ffffff");
  });

  it("uses dark text on light colors", () => {
    expect(readableTextColor("#ffffff")).toBe("#1c1917");
    expect(readableTextColor("#f5e6c8")).toBe("#1c1917");
    expect(readableTextColor("#ffd60a")).toBe("#1c1917");
  });
});

describe("darken", () => {
  it("mixes the color toward black", () => {
    expect(darken("#d90f32", 0.25)).toBe("#a30b26");
    expect(darken("#ffffff", 0.5)).toBe("#808080");
    expect(darken("#000000")).toBe("#000000");
  });
});

describe("lighten", () => {
  it("mixes toward white", () => {
    expect(lighten("#000000", 0.5)).toBe("#808080");
    expect(lighten("#c2703d", 0)).toBe("#c2703d");
    expect(lighten("#c2703d", 1)).toBe("#ffffff");
  });
});
