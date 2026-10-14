import { describe, expect, it } from "vitest";
import { daysUntil, formatEventWhen, resolveTheme, startOfEventDay } from "./event-display";

describe("resolveTheme", () => {
  it("fills in defaults for an empty theme", () => {
    expect(resolveTheme({})).toEqual({ primaryColor: "#c2703d", font: "inter" });
  });

  it("keeps saved values and replaces unknown fonts", () => {
    expect(resolveTheme({ primaryColor: "#112233", font: "playfair" })).toEqual({
      primaryColor: "#112233",
      font: "playfair",
    });
    expect(resolveTheme({ font: "comic-sans" }).font).toBe("inter");
  });
});

describe("formatEventWhen", () => {
  it("shows the day and the hours in the event timezone", () => {
    // 19:00 to 03:00 in São Paulo (UTC−3).
    expect(
      formatEventWhen(new Date("2026-11-15T22:00:00Z"), new Date("2026-11-16T06:00:00Z")),
    ).toBe("15/11 · 19h às 3h");
    expect(formatEventWhen(new Date("2026-11-15T22:30:00Z"), null)).toBe("15/11 · 19h30");
    expect(formatEventWhen(null, null)).toBe("Sem data");
  });
});

describe("startOfEventDay", () => {
  it("is local midnight in São Paulo", () => {
    expect(startOfEventDay(new Date("2026-11-16T02:00:00Z")).toISOString()).toBe(
      "2026-11-15T03:00:00.000Z",
    );
  });
});

describe("daysUntil", () => {
  it("rounds up and never goes below zero", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(daysUntil(new Date("2026-11-13T11:00:00Z"), now)).toBe(3);
    expect(daysUntil(new Date("2026-11-01T00:00:00Z"), now)).toBe(0);
  });
});
