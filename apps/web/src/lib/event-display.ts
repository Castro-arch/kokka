import type { EventTheme } from "@kokka/db";
import {
  DEFAULT_THEME,
  EVENT_TIMEZONE,
  FONT_KEYS,
  type EventStatus,
  type FontKey,
} from "@kokka/shared";

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  closed: "Encerrado",
  expired: "Expirado",
};

export const STATUS_BADGE_CLASSES: Record<EventStatus, string> = {
  draft: "bg-stone-100 text-stone-700",
  active: "bg-green-100 text-green-800",
  closed: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
};

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: EVENT_TIMEZONE,
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(date: Date | null): string {
  return date ? dateTimeFormat.format(date) : "—";
}

/** The event theme with defaults filled in and unknown fonts replaced. */
export function resolveTheme(theme: EventTheme): { primaryColor: string; font: FontKey } {
  return {
    primaryColor: theme.primaryColor ?? DEFAULT_THEME.primaryColor,
    font: FONT_KEYS.find((key) => key === theme.font) ?? DEFAULT_THEME.font,
  };
}
