import type { EventTheme } from "@kokka/db";
import {
  DEFAULT_THEME,
  EVENT_TIMEZONE,
  FONT_KEYS,
  parseLocalDateTime,
  toLocalDateTimeInput,
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

const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  timeZone: EVENT_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
});

const hourMinute = new Intl.DateTimeFormat("pt-BR", {
  timeZone: EVENT_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "29/11", in the event timezone. */
export function formatDayMonth(date: Date): string {
  return dayMonth.format(date);
}

/** "19h" or "19h30", in the event timezone. */
export function shortTime(date: Date): string {
  const [hour, minute] = hourMinute.format(date).split(":");
  return minute === "00" ? `${hour ?? ""}h` : `${hour ?? ""}h${minute ?? ""}`;
}

/** When an event happens, for its card: "15/11 · 19h às 3h". */
export function formatEventWhen(startsAt: Date | null, endsAt: Date | null): string {
  if (!startsAt) return "Sem data";
  const start = `${dayMonth.format(startsAt)} · ${shortTime(startsAt)}`;
  return endsAt ? `${start} às ${shortTime(endsAt)}` : start;
}

/** "Dia de hoje" in the event timezone, as the instant it started. */
export function startOfEventDay(now = new Date()): Date {
  const local = toLocalDateTimeInput(now).slice(0, 10);
  return parseLocalDateTime(`${local}T00:00`) ?? now;
}

/** Whole days left until `date`, never negative. */
export function daysUntil(date: Date, now = new Date()): number {
  return Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86_400_000));
}

/** Calendar days from today to `date` in the event timezone (0 = today, negative = past). */
export function calendarDaysUntil(date: Date, now = new Date()): number {
  const days = (startOfEventDay(date).getTime() - startOfEventDay(now).getTime()) / 86_400_000;
  // DST shifts make a day 23 or 25 hours long; rounding keeps the count whole.
  return Math.round(days);
}
