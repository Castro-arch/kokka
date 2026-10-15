import type { Event } from "@kokka/db";
import { calendarDaysUntil } from "./event-display";

export interface Greeting {
  title: string;
  text: string;
}

function inDays(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${String(days)} dias`;
}

/**
 * The mascot's speech bubble on the events page, from real data: whether a party is live and the
 * next draft coming up.
 */
export function adminGreeting(
  userName: string,
  events: readonly Pick<Event, "name" | "status" | "startsAt">[],
  now = new Date(),
): Greeting {
  const firstName = userName.trim().split(/\s+/)[0] ?? "";
  const hello = firstName ? `Oi, ${firstName}!` : "Oi!";
  const live = events.find((event) => event.status === "active");

  let next: { name: string; days: number } | undefined;
  for (const event of events) {
    if (event.status !== "draft" || !event.startsAt) continue;
    const days = calendarDaysUntil(event.startsAt, now);
    if (days >= 0 && (!next || days < next.days)) next = { name: event.name, days };
  }

  const sentences = [
    live && `${live.name} está ao vivo.`,
    next && `Próximo: ${next.name}, ${inDays(next.days)}.`,
  ].filter(Boolean);

  return {
    title: live ? `${hello} Hoje tem festa.` : hello,
    text: sentences.length
      ? sentences.join(" ")
      : "Nenhum evento marcado. Que tal criar o próximo?",
  };
}
