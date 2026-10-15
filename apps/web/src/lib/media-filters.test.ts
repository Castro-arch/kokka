import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  filterCriteria,
  formatDuration,
  parseMediaFilter,
} from "./media-filters";

describe("parseMediaFilter", () => {
  it("accepts known filters and falls back to all", () => {
    expect(parseMediaFilter("videos")).toBe("videos");
    expect(parseMediaFilter("nope")).toBe("todas");
    expect(parseMediaFilter(undefined)).toBe("todas");
    expect(parseMediaFilter(["fotos", "videos"])).toBe("todas");
  });
});

describe("filterCriteria", () => {
  it("shows failures in all, never uploads still in flight", () => {
    expect(filterCriteria("todas")).toEqual({
      statuses: ["processing", "ready", "hidden", "failed"],
    });
    expect(filterCriteria("fotos").statuses).not.toContain("failed");
    expect(filterCriteria("fotos").kind).toBe("image");
    expect(filterCriteria("ocultas")).toEqual({ statuses: ["hidden"] });
    expect(filterCriteria("falhou")).toEqual({ statuses: ["failed"] });
  });
});

describe("cursor", () => {
  const cursor = {
    createdAt: "2026-10-14T22:58:00.123456Z",
    id: "6f1c2c1e-6d0a-4c55-9a43-2a1f5c3e9b10",
  };

  it("round-trips", () => {
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("ignores anything else", () => {
    expect(decodeCursor("abc")).toBeUndefined();
    expect(decodeCursor(Buffer.from("not-a-date|x").toString("base64url"))).toBeUndefined();
    expect(decodeCursor(undefined)).toBeUndefined();
  });
});

describe("formatDuration", () => {
  it.each([
    [42_000, "0:42"],
    [75_000, "1:15"],
    [171_400, "2:51"],
    [180_000, "3:00"],
  ])("%d ms → %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});
