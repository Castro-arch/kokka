import type { Media } from "@kokka/db";
import type { Metadata } from "next";
import { listOwnMedia } from "@/lib/guest";
import { getStorage } from "@/lib/storage";
import { GalleryTile } from "../gallery-tile";
import { guestMetadata, loadGuestPage } from "../guest-page";
import { OwnPending } from "../own-pending";

export async function generateMetadata({ params }: PageProps<"/e/[slug]/meus">): Promise<Metadata> {
  return guestMetadata((await params).slug, "Meus envios");
}

/** "Meus envios": what this phone sent, on its way or already in the gallery. */
export default async function GuestMyUploadsPage({ params }: PageProps<"/e/[slug]/meus">) {
  const { event, deviceId } = await loadGuestPage((await params).slug);
  const own = deviceId && event.status !== "expired" ? await listOwnMedia(event.id, deviceId) : [];

  const pending = own.filter((item) => item.status !== "ready");
  const storage = getStorage();
  const ready = await Promise.all(
    own
      .filter(
        (item): item is Media & { thumbKey: string } => item.status === "ready" && !!item.thumbKey,
      )
      .map(async (item) => ({
        id: item.id,
        kind: item.kind,
        thumbUrl: await storage.signedGetUrl(item.thumbKey),
        downloadUrl: `/api/e/${event.slug}/media/${item.id}/download`,
      })),
  );

  return (
    <main className="mx-auto max-w-2xl">
      <header className="px-4 pt-6 pb-1">
        <h1 className="text-2xl font-black">Meus envios</h1>
        <p className="text-ink-soft">{event.name}</p>
      </header>

      {own.length === 0 && (
        <p className="px-5 py-10 text-center text-ink-soft">
          Você ainda não enviou fotos ou vídeos deste evento.
        </p>
      )}

      <OwnPending items={pending.map(({ id, kind, status }) => ({ id, kind, status }))} />

      {ready.length > 0 && (
        <section className="mt-6 px-4" aria-label="Na galeria">
          <ul className="grid grid-cols-3 gap-1.5">
            {ready.map((item) => (
              <GalleryTile key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
