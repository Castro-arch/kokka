import { describe, expect, it } from "vitest";
import { parseLocalDateTime, toLocalDateTimeInput } from "./datetime.ts";

describe("parseLocalDateTime", () => {
  it("interprets the value as São Paulo time", () => {
    expect(parseLocalDateTime("2026-11-21T19:30")?.toISOString()).toBe("2026-11-21T22:30:00.000Z");
  });

  it("handles zones with daylight saving time", () => {
    expect(parseLocalDateTime("2026-07-01T12:00", "Europe/Lisbon")?.toISOString()).toBe(
      "2026-07-01T11:00:00.000Z",
    );
    expect(parseLocalDateTime("2026-01-01T12:00", "Europe/Lisbon")?.toISOString()).toBe(
      "2026-01-01T12:00:00.000Z",
    );
  });

  it("rejects malformed values", () => {
    expect(parseLocalDateTime("")).toBeNull();
    expect(parseLocalDateTime("21/11/2026 19:30")).toBeNull();
  });
});

describe("toLocalDateTimeInput", () => {
  it("round-trips with parseLocalDateTime", () => {
    const date = parseLocalDateTime("2026-11-21T19:30");
    expect(date && toLocalDateTimeInput(date)).toBe("2026-11-21T19:30");
  });
});
