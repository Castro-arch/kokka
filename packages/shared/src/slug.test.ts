import { describe, expect, it } from "vitest";
import { generateSlug, isValidSlug, SLUG_ALPHABET, SLUG_LENGTH } from "./slug.ts";

describe("generateSlug", () => {
  it("produces short slugs from the unambiguous alphabet", () => {
    for (let i = 0; i < 500; i++) {
      const slug = generateSlug();
      expect(slug).toHaveLength(SLUG_LENGTH);
      expect(slug.split("").every((char) => SLUG_ALPHABET.includes(char))).toBe(true);
      expect(isValidSlug(slug)).toBe(true);
    }
  });

  it("does not repeat in a small sample", () => {
    const slugs = new Set(Array.from({ length: 1000 }, generateSlug));
    expect(slugs.size).toBe(1000);
  });
});

describe("isValidSlug", () => {
  it("rejects look-alike characters, wrong length and path tricks", () => {
    expect(isValidSlug("abc0de")).toBe(false);
    expect(isValidSlug("abcde")).toBe(false);
    expect(isValidSlug("../abc")).toBe(false);
  });
});
