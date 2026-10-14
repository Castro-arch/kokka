import type { Metadata } from "next";
import { formatDateTime } from "@/lib/event-display";
import { listOwnPending } from "@/lib/guest";
import { getStorage } from "@/lib/storage";
import { guestMetadata, loadGuestPage } from "./guest-page";
import { GuestUploader } from "./guest-uploader";
import { OwnPending } from "./own-pending";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  return guestMetadata((await params).slug);
}

/** "Enviar": where the QR code lands. */
export default async function GuestSendPage({ params }: PageProps<"/e/[slug]">) {
  const { event, color, onColor, fontClass, deviceId } = await loadGuestPage((await params).slug);
  const coverUrl = event.theme.coverKey
    ? await getStorage().signedGetUrl(event.theme.coverKey)
    : null;

  const header = (
    <header className="relative overflow-hidden" style={{ backgroundColor: color, color: onColor }}>
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div
        className={`relative px-5 pt-16 pb-8 text-center ${coverUrl ? "bg-linear-to-t from-black/70 to-black/0 text-white" : ""}`}
      >
        <h1 className={`text-4xl font-bold ${fontClass}`}>{event.name}</h1>
        {event.subtitle && <p className={`mt-1 text-lg ${fontClass}`}>{event.subtitle}</p>}
      </div>
    </header>
  );

  if (event.status === "expired") {
    return (
      <main className="mx-auto max-w-2xl">
        {header}
        <p className="px-5 py-10 text-center text-stone-700">
          Este evento acabou e as fotos e vídeos foram apagados.
        </p>
      </main>
    );
  }

  const ownPending = deviceId ? await listOwnPending(event.id, deviceId) : [];

  return (
    <main className="mx-auto max-w-2xl">
      {header}

      {event.status === "active" && <GuestUploader color={color} onColor={onColor} />}

      {event.status === "closed" && (
        <p className="mx-4 mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
          Os envios foram encerrados. Fotos e vídeos ficam disponíveis para baixar até{" "}
          {formatDateTime(event.expiresAt)}.
        </p>
      )}

      <OwnPending items={ownPending.map(({ id, kind, status }) => ({ id, kind, status }))} />
    </main>
  );
}
