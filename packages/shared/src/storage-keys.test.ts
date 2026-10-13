import { describe, expect, it } from "vitest";
import { storageKeys } from "./storage-keys.ts";

describe("storageKeys", () => {
  it("keeps every object under the event prefix", () => {
    const prefix = storageKeys.eventPrefix("ev1");
    expect(storageKeys.cover("ev1", "c1")).toBe("events/ev1/cover/c1.webp");
    expect(storageKeys.original("ev1", "m1", "HEIC")).toBe("events/ev1/original/m1.heic");
    expect(storageKeys.thumb("ev1", "m1").startsWith(prefix)).toBe(true);
    expect(storageKeys.display("ev1", "m1", "mp4")).toBe("events/ev1/display/m1.mp4");
  });

  it("sanitizes user-provided extensions", () => {
    expect(storageKeys.original("ev1", "m1", "../x")).toBe("events/ev1/original/m1.x");
    expect(storageKeys.original("ev1", "m1", "")).toBe("events/ev1/original/m1.bin");
  });
});
