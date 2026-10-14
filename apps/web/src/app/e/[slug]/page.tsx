import type { Media } from "@kokka/db";
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
import { GalleryTile, type GalleryTileItem } from "./gallery-tile";

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

      {event.status === "closed" && (
        <p className="mx-4 mt-4 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
          Os envios foram encerrados. Fotos e vídeos ficam disponíveis para baixar até{" "}
          {formatDateTime(event.expiresAt)}.
        </p>
      )}

      {ownPending.length > 0 && (
        <section className="mt-6 px-4" aria-labelledby="own-pending">
          <h2 id="own-pending" className="text-sm font-semibold text-stone-700">
            Enviados por você — processando
          </h2>
          <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {ownPending.map((item) => (
              <li
                key={item.id}
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-stone-100 text-center text-xs text-stone-600"
              >
                <span aria-hidden className="text-xl">
                  {item.kind === "video" ? "🎬" : "📷"}
                </span>
                {item.status === "failed"
                  ? "Falhou"
                  : item.status === "uploading"
                    ? "Enviando"
                    : "Processando"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 px-4" aria-labelledby="gallery">
        <h2 id="gallery" className="sr-only">
          Galeria
        </h2>
        {tiles.length > 0 ? (
          <ul className="grid grid-cols-3 gap-1.5" data-gallery>
            {tiles.map((item) => (
              <GalleryTile key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-stone-600" data-gallery-empty>
            {event.status === "active"
              ? "Nenhuma foto ainda. Que tal enviar a primeira?"
              : "Nenhuma foto neste evento."}
          </p>
        )}
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
