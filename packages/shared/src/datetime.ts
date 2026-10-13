/** All events happen in Brazil; dates are entered and shown in this zone and stored in UTC. */
export const EVENT_TIMEZONE = "America/Sao_Paulo";

const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Offset in ms between `timeZone` wall-clock time and UTC at the given instant. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - (instant - (instant % 1000));
}

/** Parses a `datetime-local` value (`YYYY-MM-DDTHH:mm`) as wall-clock time in `timeZone`. */
export function parseLocalDateTime(value: string, timeZone = EVENT_TIMEZONE): Date | null {
  const match = LOCAL_DATETIME.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle the offset correctly around DST transitions.
  let instant = wallClock - zoneOffsetMs(wallClock, timeZone);
  instant = wallClock - zoneOffsetMs(instant, timeZone);
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats a date as a `datetime-local` value in `timeZone`. */
export function toLocalDateTimeInput(date: Date, timeZone = EVENT_TIMEZONE): string {
  const local = new Date(date.getTime() + zoneOffsetMs(date.getTime(), timeZone));
  return local.toISOString().slice(0, 16);
}
