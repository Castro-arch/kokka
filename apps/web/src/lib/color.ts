const DARK_TEXT = "#1c1917";
const LIGHT_TEXT = "#ffffff";

/** WCAG relative luminance of a `#rrggbb` color. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG AA for large text: names and titles on the theme color are always large.
const LARGE_TEXT_CONTRAST = 3;

/**
 * Text color for content on a theme-colored background. White is the look we want, so it wins
 * whenever it is legible; light themes (yellow, beige, white) fall back to near-black.
 */
export function readableTextColor(background: string): string {
  const bg = luminance(background);
  return (1 + 0.05) / (bg + 0.05) >= LARGE_TEXT_CONTRAST ? LIGHT_TEXT : DARK_TEXT;
}

/** The color mixed toward black by `amount` (0–1): the bottom edge of the theme-colored blocks. */
export function darken(hex: string, amount = 0.25): string {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(value * (1 - amount))
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}
