import type { EventStatus } from "@kokka/shared";

export type AdminSection = "eventos" | "telao" | "midias" | "configuracoes";

const EVENT_PATH = /^\/admin\/eventos\/([^/]+)(?:\/([^/]+))?/;

/** Sidebar item that matches the current path. */
export function sectionFromPath(pathname: string): AdminSection {
  if (pathname.startsWith("/admin/configuracoes")) return "configuracoes";
  const sub = EVENT_PATH.exec(pathname)?.[2];
  if (sub === "telao") return "telao";
  if (sub === "midias") return "midias";
  return "eventos";
}

/** Event id in an `/admin/eventos/{id}/…` path; "novo" is the create form, not an event. */
export function eventIdFromPath(pathname: string): string | undefined {
  const id = EVENT_PATH.exec(pathname)?.[1];
  return id === "novo" ? undefined : id;
}

interface ContextCandidate {
  id: string;
  status: EventStatus;
  createdAt: Date;
}

/**
 * Event the sidebar's Telão and Mídias open when the URL names none: the live one, otherwise the
 * most recently created. Undefined without events (both items are then disabled).
 */
export function pickContextEvent(events: readonly ContextCandidate[]): string | undefined {
  const live = events.find((event) => event.status === "active");
  if (live) return live.id;
  let latest: ContextCandidate | undefined;
  for (const event of events) {
    if (!latest || event.createdAt > latest.createdAt) latest = event;
  }
  return latest?.id;
}
