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

/**
 * Suggested event colors (docs/design/admin/configuracoes.html), each with the darker edge of
 * its swatch. Any other hex color is still allowed.
 */
export const THEME_COLOR_PRESETS = [
  { label: "Terracota", color: "#c2703d", edge: "#8a4a22" },
  { label: "Vermelho", color: "#d90f32", edge: "#9e0a24" },
  { label: "Roxo", color: "#7a3fd1", edge: "#4f2391" },
  { label: "Azul", color: "#1c7ed6", edge: "#0e5a99" },
  { label: "Verde", color: "#10a34a", edge: "#0b7a37" },
  { label: "Grafite", color: "#1f2430", edge: "#000000" },
] as const;
