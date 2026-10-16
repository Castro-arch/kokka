import type { Metadata } from "next";
import { ButtonLink } from "@/components/admin/button";
import { EventTrail } from "@/components/admin/event-trail";
import { LiveHero } from "@/components/admin/live-hero";
import { PlusIcon } from "@/components/icons";
import { adminGreeting } from "@/lib/admin-greeting";
import { requireAdmin } from "@/lib/auth-guard";
import { EMPTY_STATS, statsByEvent } from "@/lib/event-stats";
import { buildTrail } from "@/lib/event-trail";
import { listEvents } from "@/lib/events";

export const metadata: Metadata = { title: "Eventos · Kokka" };

const NEW_EVENT = "/admin/eventos/novo";

/** Admin home (docs/design/admin/eventos.html): greeting, the live event and the trail. */
export default async function EventsPage() {
  const { user } = await requireAdmin();
  const [events, stats] = await Promise.all([listEvents(), statsByEvent()]);
  const now = new Date();
  const live = events.find((event) => event.status === "active");
  const greeting = adminGreeting(user.name, events, now);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">Eventos</h1>
      <div className="flex flex-wrap items-center gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
        <img src="/brand/mascot.png" alt="" className="h-14 w-18 object-contain" />
        <p className="flex-[1_1_260px] rounded-[20px] border-2 border-b-[5px] border-line bg-white px-4.5 py-3">
          <span className="block text-lg font-black">{greeting.title}</span>
          <span className="text-[15px] font-bold text-ink-soft">{greeting.text}</span>
        </p>
        <ButtonLink href={NEW_EVENT} size="lg">
          <PlusIcon className="h-5.5 w-5.5" strokeWidth={2.8} />
          Novo evento
        </ButtonLink>
      </div>

      {live ? (
        <LiveHero event={live} stats={stats.get(live.id) ?? EMPTY_STATS} now={now} />
      ) : (
        <NoLiveEvent />
      )}

      {events.length > 0 && <EventTrail items={buildTrail(events, stats, now)} />}
    </div>
  );
}

function NoLiveEvent() {
  return (
    <section
      aria-labelledby="no-live-title"
      className="flex flex-wrap items-center gap-6 rounded-[28px] border-2 border-b-8 border-line bg-white px-7 py-6.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
      <img src="/brand/mascot.png" alt="" className="h-20 w-26 object-contain" />
      <div className="flex flex-[1_1_280px] flex-col gap-1">
        <h2 id="no-live-title" className="text-2xl font-black">
          Nenhuma festa ao vivo agora
        </h2>
        <p className="text-base font-bold text-ink-soft">
          Quando um evento estiver ativo, os envios dos convidados aparecem aqui na hora.
        </p>
      </div>
      <ButtonLink href={NEW_EVENT} size="lg">
        <PlusIcon className="h-5.5 w-5.5" strokeWidth={2.8} />
        Novo evento
      </ButtonLink>
    </section>
  );
}
