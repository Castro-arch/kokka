import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, buttonClassName } from "@/components/admin/button";
import { MediaGrid } from "@/components/admin/media-grid";
import { DownloadIcon } from "@/components/icons";
import { listMedia, mediaCounts } from "@/lib/admin-media";
import { requireAdmin } from "@/lib/auth-guard";
import { EMPTY_STATS, formatBytes, statsByEvent, totalUploads } from "@/lib/event-stats";
import { getEvent } from "@/lib/events";
import {
  decodeCursor,
  MEDIA_FILTERS,
  parseMediaFilter,
  type MediaFilter,
} from "@/lib/media-filters";

export const metadata: Metadata = { title: "Mídias · Kokka" };

const PAGE_SIZE = 48;

const EMPTY: Record<MediaFilter, string> = {
  todas: "Nenhuma foto ou vídeo ainda.",
  fotos: "Nenhuma foto ainda.",
  videos: "Nenhum vídeo ainda.",
  ocultas: "Nenhuma mídia oculta.",
  falhou: "Nenhum envio falhou.",
};

/** Media of one event (docs/design/admin/midias.html): filters, a selectable grid, bulk bar. */
export default async function MediaPage({
  params,
  searchParams,
}: PageProps<"/admin/eventos/[id]/midias">) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const event = await getEvent(id);
  if (!event) notFound();

  const filter = parseMediaFilter(query.filtro);
  const cursor = decodeCursor(query.depois);
  const [counts, stats, page] = await Promise.all([
    mediaCounts(event.id),
    statsByEvent(event.id).then((all) => all.get(event.id) ?? EMPTY_STATS),
    listMedia(event.id, filter, cursor, PAGE_SIZE),
  ]);

  const base = `/admin/eventos/${event.id}/midias`;
  const filterHref = (key: MediaFilter) => (key === "todas" ? base : `${base}?filtro=${key}`);
  const pageHref = (next: string) =>
    `${base}?${new URLSearchParams({ ...(filter === "todas" ? {} : { filtro: filter }), depois: next }).toString()}`;
  // What reached the gallery, like the "envios" elsewhere; the "Todas" chip also counts failures.
  const received = totalUploads(stats);
  const items = `${String(received)} na galeria`;

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[32px] font-black">Mídias</h1>
          <span className="text-[15px] font-extrabold text-ink-soft">
            <Link
              href={`/admin/eventos/${event.id}`}
              className="text-ink-soft no-underline hover:text-ink hover:underline"
            >
              {event.name}
            </Link>{" "}
            · {items} · {formatBytes(stats.bytes)}
          </span>
        </div>
        <Button variant="sun" soon className="h-[52px] gap-2">
          <DownloadIcon className="h-5.5 w-5.5" strokeWidth={2.6} />
          Baixar tudo (ZIP)
        </Button>
      </div>

      <nav aria-label="Filtrar" className="flex flex-wrap gap-2">
        {MEDIA_FILTERS.map(({ key, label }) => {
          const active = key === filter;
          return (
            <Link
              key={key}
              href={filterHref(key)}
              aria-current={active ? "page" : undefined}
              className={`flex h-[42px] items-center rounded-full border-2 border-b-4 px-4 text-sm font-black no-underline ${
                active
                  ? "border-ink bg-ink text-white hover:text-white"
                  : key === "falhou"
                    ? "border-active-line bg-white text-brand-edge hover:bg-active hover:text-brand-edge"
                    : "border-line bg-white text-ink hover:bg-block hover:text-ink"
              }`}
            >
              {label} · {counts[key]}
            </Link>
          );
        })}
      </nav>

      {page.items.length > 0 ? (
        // Keyed by page so the selection resets when the filter or page changes.
        <MediaGrid key={`${filter}:${cursor?.id ?? ""}`} eventId={event.id} items={page.items} />
      ) : (
        <p className="rounded-[22px] border-2 border-b-[6px] border-line bg-white p-6 text-[15px] font-bold text-ink-soft">
          {EMPTY[filter]}
        </p>
      )}

      {(cursor || page.next) && (
        <div className="flex flex-wrap gap-2.5">
          {cursor && (
            <Link href={filterHref(filter)} className={buttonClassName({ variant: "outline" })}>
              Mais recentes
            </Link>
          )}
          {page.next && (
            <Link href={pageHref(page.next)} className={buttonClassName({ variant: "outline" })}>
              Ver mais antigas
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
