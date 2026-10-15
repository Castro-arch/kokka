import type { Event } from "@kokka/db";
import Link from "next/link";
import { ButtonLink } from "@/components/admin/button";
import { StatTile } from "@/components/admin/stat-tile";
import { shortTime } from "@/lib/event-display";
import { formatSince, type EventStats } from "@/lib/event-stats";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** "Casamento · começou às 19h · termina às 3h". */
function liveLine(event: Event, now: Date): string {
  const parts = [event.subtitle];
  if (event.startsAt) {
    const verb = event.startsAt <= now ? "começou" : "começa";
    parts.push(`${verb} às ${shortTime(event.startsAt)}`);
  }
  if (event.endsAt) parts.push(`termina às ${shortTime(event.endsAt)}`);
  return parts.filter(Boolean).join(" · ");
}

/** The red "Ao vivo agora" block of the events page, for the event that is active. */
export function LiveHero({ event, stats, now }: { event: Event; stats: EventStats; now: Date }) {
  const base = `/admin/eventos/${event.id}`;
  return (
    <section
      aria-labelledby="live-hero-title"
      className="flex flex-wrap items-center gap-6 rounded-[28px] border-b-8 border-brand-edge bg-brand-strong px-5 py-6.5 text-white sm:px-7"
    >
      <div className="flex flex-[1_1_320px] flex-col gap-2.5">
        <span className="flex items-center gap-1.5 self-start rounded-full bg-white px-3 py-1.25 text-[13px] font-black text-brand-edge">
          <span aria-hidden="true" className="h-2.25 w-2.25 rounded-full bg-brand-strong" />
          Ao vivo agora
        </span>
        <h2 id="live-hero-title" className="text-[40px] leading-[1.05] font-black">
          {event.name}
        </h2>
        <span className="text-lg font-extrabold">{liveLine(event, now)}</span>
        {/* Below 900px the two actions share the width and Detalhes goes under them. */}
        <div className="mt-1.5 grid grid-cols-2 gap-2.5 wide:flex wide:flex-wrap">
          <ButtonLink variant="sun" href={`${base}/telao`} className="h-[52px]">
            Abrir telão
          </ButtonLink>
          <ButtonLink variant="ghost-on-brand" href={`${base}/midias`} className="h-[52px]">
            Ver mídias
          </ButtonLink>
          <Link
            href={base}
            className="col-span-2 flex h-11 items-center justify-self-start rounded-lg text-base font-black text-white underline hover:text-white hover:decoration-2 wide:h-[52px] wide:rounded-2xl wide:px-4"
          >
            Detalhes
          </Link>
        </div>
      </div>
      <div className="grid flex-[1_1_300px] grid-cols-2 gap-3">
        <StatTile
          tone="on-brand"
          value={String(stats.images)}
          label={plural(stats.images, "foto", "fotos")}
        />
        <StatTile
          tone="on-brand"
          value={String(stats.videos)}
          label={plural(stats.videos, "vídeo", "vídeos")}
        />
        <StatTile
          tone="on-brand"
          value={String(stats.devices)}
          label={plural(stats.devices, "aparelho", "aparelhos")}
        />
        <StatTile
          tone="on-brand"
          value={stats.lastUploadAt ? formatSince(stats.lastUploadAt, now) : "—"}
          label="último envio"
        />
      </div>
    </section>
  );
}
