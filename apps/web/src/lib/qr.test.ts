import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { guestUrl, qrPng, qrSvg } from "./qr";

vi.mock("./env", () => ({ getEnv: () => ({ APP_URL: "https://kokka.example" }) }));

describe("guestUrl", () => {
  it("points at the guest gallery", () => {
    expect(guestUrl("abc234")).toBe("https://kokka.example/e/abc234");
  });
});

describe("qr", () => {
  it("renders an svg", async () => {
    expect(await qrSvg("https://kokka.example/e/abc234")).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
  });

  it("renders a png at the requested width", async () => {
    const meta = await sharp(await qrPng("https://kokka.example/e/abc234", 512)).metadata();
    expect(meta).toMatchObject({ format: "png", width: 512, height: 512 });
  });
});
