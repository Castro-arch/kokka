/** Pastel placeholders (theme tokens tile-*) for media without a thumbnail yet. */
export const TILE_TONES = ["rose", "sky", "peach", "mint", "lilac", "lemon"] as const;

export type TileTone = (typeof TILE_TONES)[number];

/** Same media, same color on every render and screen: a small hash of the id picks the tone. */
export function tileTone(id: string): TileTone {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return TILE_TONES[hash % TILE_TONES.length] ?? "rose";
}
