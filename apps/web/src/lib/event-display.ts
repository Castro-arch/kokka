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

/** "15/10, 3h": a day and an hour in the event timezone. */
export function formatDayMonthTime(date: Date): string {
  return `${formatDayMonth(date)}, ${shortTime(date)}`;
}

const CONNECTORS = new Set(["a", "e", "o", "da", "de", "do", "das", "dos"]);

/**
 * Up to three characters for the event avatar: "Ana & Pedro" → "A&P", "Bodas de Prata" → "BP",
 * "15 anos da Júlia" → "15A". Numbers stay whole; connectors are skipped.
 */
export function eventInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const amp = words.indexOf("&");
  if (amp > 0 && amp < words.length - 1) {
    return `${words[amp - 1]?.charAt(0) ?? ""}&${words[amp + 1]?.charAt(0) ?? ""}`.toUpperCase();
  }
  const marks = words
    .filter((word) => !CONNECTORS.has(word.toLowerCase()) && word !== "&")
    .slice(0, 2)
    .map((word) => (/^\d+$/.test(word) ? word : word.charAt(0)));
  return marks.join("").slice(0, 3).toUpperCase() || "?";
}
