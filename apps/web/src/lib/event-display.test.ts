import { describe, expect, it } from "vitest";
import { resolveTheme } from "./event-display";

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
