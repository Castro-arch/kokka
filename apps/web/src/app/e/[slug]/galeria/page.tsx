import type { Media } from "@kokka/db";
import type { Metadata } from "next";
import Link from "next/link";
import { darken } from "@/lib/color";
import {
  countGallery,
  decodeCursor,
  eventInitials,
  listGallery,
  listOwnPending,
} from "@/lib/guest";
import { getStorage } from "@/lib/storage";
import { GalleryLive } from "../gallery-live";
import type { GalleryTileItem } from "../gallery-tile";
import { firstParam, guestMetadata, loadGuestPage } from "../guest-page";
import { PlusIcon } from "../icons";

export async function generateMetadata({
  params,
}: PageProps<"/e/[slug]/galeria">): Promise<Metadata> {
  return guestMetadata((await params).slug, "Galeria");
}

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

/** "Galeria": every ready photo and video as a mosaic, live while the page is open. */
export default async function GuestGalleryPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/galeria">) {
  const { event, color, onColor, deviceId } = await loadGuestPage((await params).slug);

  if (event.status === "expired") {
    return (
      <main className="mx-auto max-w-2xl p-5">
        <p className="block-card p-5 text-center font-extrabold text-ink-soft">
          Este evento acabou e as fotos e vídeos foram apagados.
        </p>
      </main>
    );
  }

  const cursor = decodeCursor(firstParam((await searchParams).antes));
  const [gallery, counts, ownPending] = await Promise.all([
    listGallery(event.id, cursor),
    countGallery(event.id),
    deviceId && !cursor ? listOwnPending(event.id, deviceId) : Promise.resolve([]),
  ]);
  // While the worker prepares them, the gallery tells the guest their uploads are coming.
  const ownUploadsOnTheWay = ownPending.some((item) => item.status !== "failed");

  const storage = getStorage();
  const tiles: GalleryTileItem[] = await Promise.all(
    gallery.items
      .filter((item): item is Media & { thumbKey: string } => item.thumbKey !== null)
      .map(async (item) => ({
        id: item.id,
        kind: item.kind,
        thumbUrl: await storage.signedGetUrl(item.thumbKey),
        downloadUrl: `/api/e/${event.slug}/media/${item.id}/download`,
      })),
  );

  return (
    <main className="mx-auto max-w-2xl">
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border-b-4 text-lg font-black"
          style={{ backgroundColor: color, color: onColor, borderColor: darken(color) }}
        >
          {eventInitials(event.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-tight font-black">Galeria da festa</h1>
          <p className="truncate text-sm font-extrabold text-ink-soft">
            {plural(counts.images, "foto", "fotos")} · {plural(counts.videos, "vídeo", "vídeos")}
          </p>
        </div>
        {event.status === "active" && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[#9bd8b5] bg-[#e6f7ee] px-2.5 py-1 text-xs font-black text-[#0b5a2a]">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[#10a34a]" />
            Ao vivo
          </span>
        )}
      </header>

      <section className="px-5" aria-label="Fotos e vídeos">
        <GalleryLive
          slug={event.slug}
          initial={tiles}
          live={!cursor}
          emptyMessage={
            ownUploadsOnTheWay
              ? "Suas fotos aparecem aqui em instantes."
              : event.status === "active"
                ? "Nenhuma foto ainda. Que tal enviar a primeira?"
                : "Nenhuma foto neste evento."
          }
        />
        {gallery.next && (
          <div className="mt-4 text-center">
            <Link href={`/e/${event.slug}/galeria?antes=${gallery.next}`} className="btn-secondary">
              Ver mais
            </Link>
          </div>
        )}
      </section>

      {event.status === "active" && (
        <Link
          href={`/e/${event.slug}`}
          aria-label="Enviar foto ou vídeo"
          className="fixed right-5 bottom-26 z-10 flex h-17 w-17 items-center justify-center rounded-[22px] border-b-[6px] border-brand-deep bg-brand-strong text-white hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <PlusIcon className="h-8 w-8" strokeWidth={2.6} />
        </Link>
      )}
    </main>
  );
}
