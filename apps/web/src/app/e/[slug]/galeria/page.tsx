import type { Media } from "@kokka/db";
import type { Metadata } from "next";
import Link from "next/link";
import { decodeCursor, listGallery, listOwnPending } from "@/lib/guest";
import { getStorage } from "@/lib/storage";
import { GalleryLive } from "../gallery-live";
import type { GalleryTileItem } from "../gallery-tile";
import { firstParam, guestMetadata, loadGuestPage } from "../guest-page";

export async function generateMetadata({
  params,
}: PageProps<"/e/[slug]/galeria">): Promise<Metadata> {
  return guestMetadata((await params).slug, "Galeria");
}

/** "Galeria": every ready photo and video, live while the page is open. */
export default async function GuestGalleryPage({
  params,
  searchParams,
}: PageProps<"/e/[slug]/galeria">) {
  const { event, color, onColor, deviceId } = await loadGuestPage((await params).slug);

  if (event.status === "expired") {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10 text-center text-stone-700">
        Este evento acabou e as fotos e vídeos foram apagados.
      </main>
    );
  }

  const cursor = decodeCursor(firstParam((await searchParams).antes));
  const [gallery, ownPending] = await Promise.all([
    listGallery(event.id, cursor),
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
      <header className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-black">Galeria da festa</h1>
        <p className="text-ink-soft">{event.name}</p>
      </header>
      <section className="px-4" aria-label="Fotos e vídeos">
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
            <Link
              href={`/e/${event.slug}/galeria?antes=${gallery.next}`}
              className="inline-block rounded-lg px-4 py-2 font-medium"
              style={{ backgroundColor: color, color: onColor }}
            >
              Ver mais
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
