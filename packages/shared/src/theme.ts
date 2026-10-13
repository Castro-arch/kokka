export const FONT_OPTIONS = [
  { key: "inter", label: "Inter" },
  { key: "montserrat", label: "Montserrat" },
  { key: "playfair", label: "Playfair Display" },
  { key: "cormorant", label: "Cormorant Garamond" },
  { key: "great-vibes", label: "Great Vibes" },
] as const;

export type FontKey = (typeof FONT_OPTIONS)[number]["key"];

export const FONT_KEYS = FONT_OPTIONS.map((option) => option.key) as [FontKey, ...FontKey[]];

export const DEFAULT_THEME = {
  primaryColor: "#c2703d",
  font: "inter",
} as const satisfies { primaryColor: string; font: FontKey };
