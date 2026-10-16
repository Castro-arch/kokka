import type { MediaKind, MediaStatus } from "@kokka/shared";

/** Filters of the admin media screen, in the order of their chips; the value goes in `?filtro=`. */
export const MEDIA_FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "fotos", label: "Fotos" },
  { key: "videos", label: "Vídeos" },
  { key: "ocultas", label: "Ocultas" },
  { key: "falhou", label: "Falhou" },
] as const;

export type MediaFilter = (typeof MEDIA_FILTERS)[number]["key"];

export function parseMediaFilter(value: string | string[] | undefined): MediaFilter {
  return MEDIA_FILTERS.find((filter) => filter.key === value)?.key ?? "todas";
}

/**
 * Statuses and kind each filter shows. "Todas" is every upload that left the phone, failures
 * included; photos and videos count only what reached storage.
 */
export function filterCriteria(filter: MediaFilter): {
  statuses: MediaStatus[];
  kind?: MediaKind;
} {
  const received: MediaStatus[] = ["processing", "ready", "hidden"];
  switch (filter) {
    case "todas":
      return { statuses: [...received, "failed"] };
    case "fotos":
      return { statuses: received, kind: "image" };
    case "videos":
      return { statuses: received, kind: "video" };
    case "ocultas":
      return { statuses: ["hidden"] };
    case "falhou":
      return { statuses: ["failed"] };
  }
}

export interface MediaCursor {
  /** ISO timestamp with the microseconds Postgres keeps (a Date would round them off). */
  createdAt: string;
  id: string;
}

/** Opaque `?depois=` value: the last item of a page, newest-first order. */
export function encodeCursor(cursor: MediaCursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`).toString("base64url");
}

/** Undefined for anything that is not a cursor we made, so a bad URL shows the first page. */
export function decodeCursor(value: string | string[] | undefined): MediaCursor | undefined {
  if (typeof value !== "string" || value.length > 200) return undefined;
  const [iso, id] = Buffer.from(value, "base64url").toString("utf8").split("|");
  if (!iso || !id || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/.test(iso)) return undefined;
  return Number.isNaN(Date.parse(iso)) ? undefined : { createdAt: iso, id };
}

/** "0:42", "2:51": video length on its tile. */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}
