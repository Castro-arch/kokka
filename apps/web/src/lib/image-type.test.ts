import { describe, expect, it } from "vitest";
import { sniffImageType } from "./image-type";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === "string" ? Array.from(part, (char) => char.charCodeAt(0)) : part,
    ),
  );

describe("sniffImageType", () => {
  it("detects jpeg, png and webp by signature", () => {
    expect(sniffImageType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(sniffImageType(bytes("\x89PNG\r\n\x1a\n"))).toBe("png");
    expect(sniffImageType(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))).toBe("webp");
  });

  it("detects heic photos but not avif", () => {
    expect(sniffImageType(bytes([0, 0, 0, 24], "ftypheic"))).toBe("heic");
    expect(sniffImageType(bytes([0, 0, 0, 24], "ftypmif1"))).toBe("heic");
    expect(sniffImageType(bytes([0, 0, 0, 24], "ftypavif"))).toBeNull();
  });

  it("returns null for anything else", () => {
    expect(sniffImageType(bytes("GIF89a"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
