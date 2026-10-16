import type { MediaKind } from "@kokka/shared";
import { formatSince } from "./event-stats";
import { formatDuration } from "./media-filters";

/** Uploads younger than this get the "Nova" badge in the projector queue. */
export const NEW_FOR_MS = 5 * 60_000;

export interface QueueItem {
  id: string;
  kind: MediaKind;
  durationMs: number | null;
  createdAt: Date;
}

export function isNew(item: Pick<QueueItem, "createdAt">, now = new Date()): boolean {
  return now.getTime() - item.createdAt.getTime() < NEW_FOR_MS;
}

/** "Vídeo · 0:42", "Foto · chegou agora", "Foto · há 12 min". */
export function queueLabel(item: QueueItem, now = new Date()): string {
  if (item.kind === "video") {
    return item.durationMs === null ? "Vídeo" : `Vídeo · ${formatDuration(item.durationMs)}`;
  }
  const since = formatSince(item.createdAt, now);
  if (isNew(item, now))
    return since === "agora" ? "Foto · chegou agora" : `Foto · chegou há ${since}`;
  return `Foto · há ${since}`;
}
