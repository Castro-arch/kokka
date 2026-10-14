import type { Metadata } from "next";
import { listOwnMedia } from "@/lib/guest";
import { getStorage } from "@/lib/storage";
import { guestMetadata, loadGuestPage } from "../guest-page";
import { OwnPending } from "../own-pending";

export async function generateMetadata({ params }: PageProps<"/e/[slug]/meus">): Promise<Metadata> {
  return guestMetadata((await params).slug, "Meus envios");
}

/** "Meus envios": what this phone sent, on its way or already in the gallery. */
export default async function GuestMyUploadsPage({ params }: PageProps<"/e/[slug]/meus">) {
  const { event, deviceId } = await loadGuestPage((await params).slug);
  const own = deviceId && event.status !== "expired" ? await listOwnMedia(event.id, deviceId) : [];
  const storage = getStorage();
  const items = await Promise.all(
    own.map(async ({ id, kind, status, thumbKey }) => ({
      id,
      kind,
      status,
      thumbUrl: status === "ready" && thumbKey ? await storage.signedGetUrl(thumbKey) : undefined,
    })),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-5">
      <header>
        <h1 className="text-[22px] leading-tight font-black">Meus envios</h1>
        <p className="font-extrabold text-ink-soft">{event.name}</p>
      </header>

      {items.length === 0 ? (
        <div className="block-card flex flex-col items-center gap-2 p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
          <img src="/brand/mascot.png" alt="" className="h-16 w-20 object-contain" />
          <p className="font-extrabold text-ink-soft">
            Você ainda não enviou fotos ou vídeos deste evento.
          </p>
        </div>
      ) : (
        <OwnPending items={items} title="Tudo que você enviou" />
      )}
    </main>
  );
}
