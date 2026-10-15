import type { Event } from "@kokka/db";
import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  BoltIcon,
  CameraIcon,
  ClockIcon,
  PeopleIcon,
  PlusIcon,
  VideoIcon,
} from "@/components/icons";
import { requireAdmin } from "@/lib/auth-guard";
import { readableTextColor } from "@/lib/color";
import {
  daysUntil,
  formatDateTime,
  formatEventWhen,
  resolveTheme,
  startOfEventDay,
  STATUS_LABELS,
} from "@/lib/event-display";
import { adminSummary, listEvents, mediaCountsByEvent, type MediaCounts } from "@/lib/events";

export const metadata: Metadata = { title: "Eventos · Kokka" };

/** Live first, then drafts being prepared, then closed and expired ones. */
const STATUS_ORDER: Record<Event["status"], number> = {
  active: 0,
  draft: 1,
  closed: 2,
  expired: 3,
};

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

/** Events overview (docs/design, "Admin · Eventos"): today's numbers and a card per event. */
export default async function EventsPage() {
  await requireAdmin();
  const [events, counts, summary] = await Promise.all([
    listEvents(),
    mediaCountsByEvent(),
    adminSummary(startOfEventDay()),
  ]);
  const sorted = [...events].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const greeting =
    summary.liveEvents === 0
      ? "Nenhuma festa no ar agora."
      : summary.liveEvents === 1
        ? "Uma festa no ar agora. Bora acompanhar!"
        : `${String(summary.liveEvents)} festas no ar agora. Bora acompanhar!`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[34px] leading-tight font-black">Seus eventos</h1>
          <p className="text-[17px] font-bold text-ink-soft">{greeting}</p>
        </div>
        <Link href="/admin/eventos/novo" className="btn-primary h-14 px-6 text-[17px]">
          <PlusIcon className="h-5.5 w-5.5" strokeWidth={2.8} />
          Novo evento
        </Link>
      </div>

      <section
        aria-label="Resumo"
        className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5"
      >
        <SummaryBlock
          Icon={BoltIcon}
          value={summary.liveEvents}
          label={summary.liveEvents === 1 ? "evento ao vivo" : "eventos ao vivo"}
          tone="bg-active text-brand-edge"
        />
        <SummaryBlock
          Icon={CameraIcon}
          value={summary.imagesToday}
          label="fotos hoje"
          tone="bg-sun-soft text-[#6b4300]"
        />
        <SummaryBlock
          Icon={VideoIcon}
          value={summary.videosToday}
          label="vídeos hoje"
          tone="bg-[#e3f0ff] text-[#0b3d7a]"
        />
        <SummaryBlock
          Icon={PeopleIcon}
          value={summary.sendersToday}
          label="convidados enviando"
          tone="bg-[#e6f7ee] text-[#0b5a2a]"
        />
      </section>

      {sorted.length === 0 ? (
        <div className="block-card flex flex-col items-center gap-3 p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
          <img src="/brand/mascot.png" alt="" className="h-20 w-26 object-contain" />
          <p className="text-lg font-extrabold text-ink-soft">
            Nenhum evento ainda. Crie o primeiro para gerar o QR Code das mesas.
          </p>
        </div>
      ) : (
        <section
          aria-label="Eventos"
          className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4.5"
        >
          {sorted.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              counts={counts.get(event.id) ?? { images: 0, videos: 0 }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function SummaryBlock({
  Icon,
  value,
  label,
  tone,
}: {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="block-card flex items-center gap-3.5 px-4.5 py-4">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${tone}`}
      >
        <Icon className="h-6 w-6" strokeWidth={2.4} />
      </span>
      <span className="flex flex-col">
        <span className="text-[28px] leading-tight font-black">{value}</span>
        <span className="text-sm font-extrabold text-ink-soft">{label}</span>
      </span>
    </div>
  );
}

const BADGES: Record<Event["status"], string> = {
  active: "bg-[#e6f7ee] text-[#0b5a2a]",
  draft: "bg-white text-[#3a3f4b]",
  closed: "bg-sun-soft text-sun-text",
  expired: "bg-white/85 text-ink-soft",
};

function EventCard({ event, counts }: { event: Event; counts: MediaCounts }) {
  const { primaryColor } = resolveTheme(event.theme);
  const manage = `/admin/eventos/${event.id}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-[22px] border-2 border-b-[6px] border-line bg-white">
      <div
        className={`flex h-23 items-start justify-between px-4.5 py-4 ${event.status === "expired" ? "opacity-60" : ""}`}
        style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${BADGES[event.status]}`}
        >
          {event.status === "active" && (
            <span aria-hidden className="h-2 w-2 rounded-full bg-[#10a34a]" />
          )}
          {event.status === "active" ? "Ao vivo" : STATUS_LABELS[event.status]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4.5 pt-4 pb-4.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[21px] leading-tight font-black">{event.name}</h2>
          <span className="text-sm font-extrabold text-ink-soft">
            {formatEventWhen(event.startsAt, event.endsAt)}
          </span>
        </div>

        {event.status !== "draft" && (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-[10px] bg-block px-2.5 py-1.5 text-[13px] font-black">
              {plural(counts.images, "foto", "fotos")}
            </span>
            <span className="rounded-[10px] bg-block px-2.5 py-1.5 text-[13px] font-black">
              {plural(counts.videos, "vídeo", "vídeos")}
            </span>
          </div>
        )}

        {event.status === "closed" && event.expiresAt && (
          <p className="flex items-center gap-2.5 rounded-xl border-2 border-sun-line bg-sun-soft px-3 py-2.5 text-[13px] font-black text-sun-text">
            <ClockIcon className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            Apagado em {plural(daysUntil(event.expiresAt), "dia", "dias")} ·{" "}
            {formatDateTime(event.expiresAt)}
          </p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2.5">
          {event.status === "active" ? (
            <>
              <a
                href={`/e/${event.slug}/galeria`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary h-12 px-3 text-[15px]"
              >
                Ver galeria
              </a>
              <Link href={manage} className="btn-secondary h-12 px-3 text-[15px]">
                Gerenciar
              </Link>
            </>
          ) : (
            <Link href={manage} className="btn-secondary col-span-2 h-12 text-[15px]">
              {event.status === "draft" ? "Continuar configurando" : "Gerenciar"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
