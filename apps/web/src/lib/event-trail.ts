import type { Event } from "@kokka/db";
import type { EventStatus } from "@kokka/shared";
import { calendarDaysUntil, daysUntil, formatDayMonth } from "./event-display";
import { EMPTY_STATS, totalUploads, type EventStats } from "./event-stats";

export interface TrailItem {
  id: string;
  name: string;
  status: EventStatus;
  /** Side the text sits on; the node goes on the other side of the center line. */
  side: "left" | "right";
  /** "29/11 · Rascunho · faltam 46 dias". */
  meta: string;
  /** Next step for this event, shown as a link under the meta line. */
  action?: { label: string; href: string };
  /** Closed events only: when the files are deleted, e.g. "Apagado em 3 dias". */
  deletion?: string;
}

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

/** Start date, or creation for events without one: what the trail is ordered by. */
const trailDate = (event: Event) => event.startsAt ?? event.createdAt;

function draftCountdown(startsAt: Date | null, now: Date): string | undefined {
  if (!startsAt) return undefined;
  const days = calendarDaysUntil(startsAt, now);
  if (days < 0) return undefined;
  if (days === 0) return "é hoje";
  return days === 1 ? "falta 1 dia" : `faltam ${String(days)} dias`;
}

function deletionNotice(expiresAt: Date | null, now: Date): string | undefined {
  if (!expiresAt) return undefined;
  const days = daysUntil(expiresAt, now);
  return days === 0 ? "Apagado hoje" : `Apagado em ${plural(days, "dia", "dias")}`;
}

/**
 * The events page trail (docs/design/admin/eventos.html): from the furthest upcoming event to the
 * oldest, alternating sides, with what to do next on each.
 */
export function buildTrail(
  events: readonly Event[],
  stats: ReadonlyMap<string, EventStats>,
  now = new Date(),
): TrailItem[] {
  return [...events]
    .sort((a, b) => trailDate(b).getTime() - trailDate(a).getTime())
    .map((event, index) => {
      const date = event.startsAt ? formatDayMonth(event.startsAt) : "Sem data";
      const uploads = plural(totalUploads(stats.get(event.id) ?? EMPTY_STATS), "envio", "envios");
      const base = {
        id: event.id,
        name: event.name,
        status: event.status,
        side: index % 2 === 0 ? ("left" as const) : ("right" as const),
      };
      switch (event.status) {
        case "draft":
          return {
            ...base,
            meta: [date, "Rascunho", draftCountdown(event.startsAt, now)]
              .filter(Boolean)
              .join(" · "),
            action: { label: "Terminar de configurar", href: `/admin/eventos/${event.id}` },
          };
        case "active":
          return {
            ...base,
            meta: `${date} · Ao vivo · ${uploads}`,
            action: { label: "Abrir telão", href: `/admin/eventos/${event.id}/telao` },
          };
        case "closed":
          return {
            ...base,
            meta: `${date} · Encerrado · ${uploads}`,
            deletion: deletionNotice(event.expiresAt, now),
          };
        case "expired":
          return { ...base, meta: `${date} · Concluído e apagado` };
      }
    });
}
