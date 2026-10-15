import type { Event } from "@kokka/db";
import type { ReactNode } from "react";
import { EventTabs } from "@/components/admin/event-tabs";
import { StatusChip } from "@/components/admin/status-chip";
import { darken, lighten } from "@/lib/color";
import { eventInitials, formatDayMonth, resolveTheme, shortTime } from "@/lib/event-display";
import type { EventTab } from "@/lib/event-tabs";

/** "Casamento · 14/10, 19h às 3h · kokka.app/e/anapedro". */
function eventLine(event: Event, link: string): string {
  let when: string | undefined;
  if (event.startsAt) {
    when = `${formatDayMonth(event.startsAt)}, ${shortTime(event.startsAt)}`;
    if (event.endsAt) when += ` às ${shortTime(event.endsAt)}`;
  }
  return [event.subtitle, when, link].filter(Boolean).join(" · ");
}

/**
 * Top of the event page (docs/design/admin/evento.html): a cover in the event's theme color (or
 * its cover photo), the initials badge, name, status, actions and the tabs.
 */
export function EventHeader({
  event,
  link,
  coverUrl,
  tab,
  actions,
}: {
  event: Event;
  /** Guest link without the protocol. */
  link: string;
  coverUrl: string | null;
  tab: EventTab;
  actions: ReactNode;
}) {
  const color = resolveTheme(event.theme).primaryColor;
  // Theme colors are event data, so they come in as inline styles rather than tokens.
  const cover = coverUrl
    ? {
        backgroundImage: `url("${coverUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundColor: color,
        backgroundImage: `radial-gradient(circle at 20% 30%, ${lighten(color, 0.2)} 0 40px, transparent 41px), radial-gradient(circle at 85% 70%, ${darken(color, 0.14)} 0 60px, transparent 61px)`,
      };

  return (
    <section
      aria-labelledby="event-title"
      className="overflow-hidden rounded-[26px] border-2 border-b-[6px] border-line bg-white"
    >
      <div aria-hidden="true" className="h-27.5" style={cover} />
      <div className="-mt-10 flex flex-wrap items-end gap-4 px-6 pb-5.5">
        <span
          aria-hidden="true"
          className="flex h-23 w-23 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-white text-[26px] font-black shadow-[0_0_0_2px_var(--color-line)]"
          style={{ color: darken(color, 0.29) }}
        >
          {eventInitials(event.name)}
        </span>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 id="event-title" className="text-[30px] font-black">
              {event.name}
            </h1>
            <StatusChip status={event.status} />
          </div>
          <span className="text-[15px] font-extrabold break-words text-ink-soft">
            {eventLine(event, link)}
          </span>
        </div>
        <div className="flex flex-wrap items-start gap-2.5">{actions}</div>
      </div>
      <EventTabs eventId={event.id} active={tab} />
    </section>
  );
}
