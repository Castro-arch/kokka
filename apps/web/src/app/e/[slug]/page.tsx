import type { Metadata } from "next";
import { darken } from "@/lib/color";
import { formatDateTime } from "@/lib/event-display";
import { listOwnMedia } from "@/lib/guest";
import { getStorage } from "@/lib/storage";
import { EventHeader } from "./event-header";
import { guestMetadata, loadGuestPage } from "./guest-page";
import { GuestUploader } from "./guest-uploader";
import { OwnPending } from "./own-pending";

/** Latest own uploads shown under the buttons; the rest is in "Meus envios". */
const OWN_ON_SEND_PAGE = 6;

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  return guestMetadata((await params).slug);
}

/** "Enviar": where the QR code lands (docs/design, "Convidado · Enviar"). */
export default async function GuestSendPage({ params }: PageProps<"/e/[slug]">) {
  const { event, color, onColor, fontClass, deviceId } = await loadGuestPage((await params).slug);
  const storage = getStorage();
  const coverUrl = event.theme.coverKey ? await storage.signedGetUrl(event.theme.coverKey) : null;

  const header = (
    <EventHeader
      name={event.name}
      subtitle={event.subtitle}
      color={color}
      onColor={onColor}
      fontClass={fontClass}
      coverUrl={coverUrl}
      live={event.status === "active"}
    />
  );

  if (event.status === "expired") {
    return (
      <main className="mx-auto max-w-2xl">
        {header}
        <p className="block-card mx-5 mt-6 p-5 text-center font-extrabold text-ink-soft">
          Este evento acabou e as fotos e vídeos foram apagados.
        </p>
      </main>
    );
  }

  const own = deviceId ? await listOwnMedia(event.id, deviceId, OWN_ON_SEND_PAGE) : [];
  const ownItems = await Promise.all(
    own.map(async ({ id, kind, status, thumbKey }) => ({
      id,
      kind,
      status,
      thumbUrl: status === "ready" && thumbKey ? await storage.signedGetUrl(thumbKey) : undefined,
    })),
  );

  return (
    <main className="mx-auto max-w-2xl">
      {header}
      <div className="flex flex-col gap-5 p-5">
        {event.status === "active" && (
          <GuestUploader color={color} colorEdge={darken(color)} onColor={onColor} />
        )}

        {event.status === "closed" && (
          <p className="rounded-[18px] border-2 border-b-[5px] border-sun-line bg-sun-soft p-4 font-extrabold text-sun-text">
            Os envios foram encerrados. Fotos e vídeos ficam disponíveis para baixar até{" "}
            {formatDateTime(event.expiresAt)}.
          </p>
        )}

        <OwnPending items={ownItems} />
      </div>
    </main>
  );
}
