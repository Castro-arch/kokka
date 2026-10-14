import type { Media } from "@kokka/db";
import { MAX_VIDEO_DURATION_MS, UPLOAD_PART_SIZE_BYTES } from "@kokka/shared";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readableTextColor } from "@/lib/color";
import { DEVICE_COOKIE, isDeviceId } from "@/lib/device";
import { formatDateTime, resolveTheme } from "@/lib/event-display";
import { FONT_CLASS_NAMES } from "@/lib/fonts";
import { decodeCursor, getGuestEvent, listGallery, listOwnPending } from "@/lib/guest";
import { getStorage } from "@/lib/storage";
import { GalleryLive } from "./gallery-live";
import type { GalleryTileItem } from "./gallery-tile";
import { OwnPending } from "./own-pending";
import { GuestUploader } from "./guest-uploader";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const event = await getGuestEvent((await params).slug);
  // Private events: keep them out of search engines and link previews generic.
  return { title: event ? `${event.name} · Kokka` : "Kokka", robots: { index: false } };
}

export default async function GuestEventPage({ params, searchParams }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const event = await getGuestEvent(slug);
  if (!event) notFound();

  const theme = resolveTheme(event.theme);
  const onTheme = readableTextColor(theme.primaryColor);
  const fontClass = FONT_CLASS_NAMES[theme.font];
  const storage = getStorage();
  const coverUrl = event.theme.coverKey ? await storage.signedGetUrl(event.theme.coverKey) : null;

  const header = (
    <header
      className="relative overflow-hidden"
      style={{ backgroundColor: theme.primaryColor, color: onTheme }}
    >
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
      <main className="mx-auto min-h-dvh max-w-2xl bg-white">
        {header}
        <p className="px-5 py-10 text-center text-stone-700">
          Este evento acabou e as fotos e vídeos foram apagados.
        </p>
      </main>
    );
  }

  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  const cursor = decodeCursor(firstParam((await searchParams).antes));
  const [gallery, ownPending] = await Promise.all([
    listGallery(event.id, cursor),
    isDeviceId(deviceId) && !cursor ? listOwnPending(event.id, deviceId) : Promise.resolve([]),
  ]);

  // While the worker prepares them, the gallery tells the guest their uploads are coming.
  const ownUploadsOnTheWay = ownPending.some((item) => item.status !== "failed");

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
    <main className="mx-auto min-h-dvh max-w-2xl bg-white pb-12">
      {header}

      {event.status === "active" && (
        <GuestUploader
          slug={event.slug}
          partSizeBytes={UPLOAD_PART_SIZE_BYTES}
          maxVideoDurationMs={MAX_VIDEO_DURATION_MS}
          color={theme.primaryColor}
          onColor={onTheme}
        />
      )}

      {event.status === "closed" && (
        <p className="mx-4 mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
          Os envios foram encerrados. Fotos e vídeos ficam disponíveis para baixar até{" "}
          {formatDateTime(event.expiresAt)}.
        </p>
      )}

      <OwnPending items={ownPending.map(({ id, kind, status }) => ({ id, kind, status }))} />

      <section className="mt-6 px-4" aria-labelledby="gallery">
        <h2 id="gallery" className="sr-only">
          Galeria
        </h2>
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
              href={`/e/${event.slug}?antes=${gallery.next}`}
              className="inline-block rounded-lg px-4 py-2 font-medium"
              style={{ backgroundColor: theme.primaryColor, color: onTheme }}
            >
              Ver mais
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
