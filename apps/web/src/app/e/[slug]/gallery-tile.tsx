import type { MediaKind } from "@kokka/shared";

export interface GalleryTileItem {
  id: string;
  kind: MediaKind;
  thumbUrl: string;
  downloadUrl: string;
}

/**
 * One gallery item. No hooks, so the server page and the live updates (client) render the same
 * markup.
 */
export function GalleryTile({ item }: { item: GalleryTileItem }) {
  const label = item.kind === "video" ? "Vídeo" : "Foto";
  return (
    <li
      className="relative aspect-square overflow-hidden rounded-lg bg-stone-200"
      data-media={item.id}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs, already sized */}
      <img
        src={item.thumbUrl}
        alt={label}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      {item.kind === "video" && (
        <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
          ▶ Vídeo
        </span>
      )}
      <a
        href={item.downloadUrl}
        className="absolute right-1.5 bottom-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white focus-visible:outline-2 focus-visible:outline-white"
        aria-label={`Baixar ${label.toLowerCase()} original`}
      >
        Baixar
      </a>
    </li>
  );
}
