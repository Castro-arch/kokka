import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FontKey } from "@kokka/shared";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readableTextColor } from "./color";
import { qrPng } from "./qr";

/** A6 (105 × 148 mm) at 300 dpi. */
export const CARD_WIDTH = 1240;
export const CARD_HEIGHT = 1748;
const CARD_DPI = 300;

// Static TTFs (next/og cannot read variable fonts or next/font). The standalone build ships them
// through outputFileTracingIncludes; the server runs from the app directory.
const FONTS_DIR = join(process.cwd(), "assets/fonts");

const FONT_FILES: Record<FontKey, { name: string; regular: string; bold: string }> = {
  inter: { name: "Inter", regular: "inter/Inter-Regular.ttf", bold: "inter/Inter-Bold.ttf" },
  montserrat: {
    name: "Montserrat",
    regular: "montserrat/Montserrat-Regular.ttf",
    bold: "montserrat/Montserrat-Bold.ttf",
  },
  playfair: {
    name: "Playfair Display",
    regular: "playfair/PlayfairDisplay-Regular.ttf",
    bold: "playfair/PlayfairDisplay-Bold.ttf",
  },
  cormorant: {
    name: "Cormorant Garamond",
    regular: "cormorant/CormorantGaramond-Regular.ttf",
    bold: "cormorant/CormorantGaramond-Bold.ttf",
  },
  // Script face with a single weight.
  "great-vibes": {
    name: "Great Vibes",
    regular: "great-vibes/GreatVibes-Regular.ttf",
    bold: "great-vibes/GreatVibes-Regular.ttf",
  },
};

const fontCache = new Map<string, Promise<Buffer>>();

function loadFont(file: string): Promise<Buffer> {
  let font = fontCache.get(file);
  if (!font) {
    font = readFile(join(FONTS_DIR, file));
    font.catch(() => fontCache.delete(file));
    fontCache.set(file, font);
  }
  return font;
}

export interface PrintCardInput {
  name: string;
  subtitle: string | null;
  primaryColor: string;
  font: FontKey;
  url: string;
}

/** Long names shrink so they stay within three lines. */
export function nameFontSize(name: string): number {
  if (name.length <= 16) return 112;
  if (name.length <= 28) return 92;
  if (name.length <= 44) return 76;
  return 62;
}

/** The printable table card as a PNG tagged 300 dpi, so it prints at A6 without scaling. */
export async function renderPrintCard(card: PrintCardInput): Promise<Buffer> {
  const theme = FONT_FILES[card.font];
  const body = FONT_FILES.inter;
  const [themeRegular, themeBold, bodyRegular, bodyBold, qr] = await Promise.all([
    loadFont(theme.regular),
    loadFont(theme.bold),
    loadFont(body.regular),
    loadFont(body.bold),
    qrPng(card.url, 760),
  ]);
  const textColor = readableTextColor(card.primaryColor);
  const displayUrl = card.url.replace(/^https?:\/\//, "");

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "110px 90px 90px",
        backgroundColor: card.primaryColor,
        color: textColor,
        fontFamily: "Body",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div
          style={{
            fontFamily: "Theme",
            fontWeight: 700,
            fontSize: nameFontSize(card.name),
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          {card.name}
        </div>
        {card.subtitle && (
          <div style={{ fontFamily: "Theme", fontSize: 46, textAlign: "center", lineHeight: 1.25 }}>
            {card.subtitle}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 36,
          borderRadius: 48,
          backgroundColor: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not a browser */}
        <img
          src={`data:image/png;base64,${qr.toString("base64")}`}
          width={680}
          height={680}
          alt=""
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 50, textAlign: "center" }}>
          Compartilhe suas fotos e vídeos
        </div>
        <div style={{ fontSize: 36, textAlign: "center", lineHeight: 1.3 }}>
          Aponte a câmera do celular para o código
        </div>
        <div style={{ fontSize: 30, opacity: 0.85, marginTop: 6 }}>{displayUrl}</div>
      </div>
    </div>,
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts: [
        { name: "Theme", data: themeRegular, weight: 400, style: "normal" },
        { name: "Theme", data: themeBold, weight: 700, style: "normal" },
        { name: "Body", data: bodyRegular, weight: 400, style: "normal" },
        { name: "Body", data: bodyBold, weight: 700, style: "normal" },
      ],
    },
  );

  const png = Buffer.from(await image.arrayBuffer());
  return sharp(png).withMetadata({ density: CARD_DPI }).png().toBuffer();
}
