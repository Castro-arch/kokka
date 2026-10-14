import type { MediaKind } from "@kokka/shared";
import { DownloadIcon, PlayIcon } from "@/components/icons";

export interface GalleryTileItem {
  id: string;
  kind: MediaKind;
  thumbUrl: string;
  downloadUrl: string;
}

/** Mosaic rhythm (docs/design, "Convidado · Galeria"): some tiles span two rows or columns. */
const SPANS: Record<number, string> = { 0: "row-span-2", 3: "col-span-2", 6: "row-span-2" };

export function mosaicSpan(index: number): string {
  return SPANS[index % 10] ?? "";
}

/**
 * One gallery item. No hooks, so the server page and the live updates (client) render the same
 * markup.
 */
export function GalleryTile({
  item,
  span = "",
  isNew = false,
}: {
  item: GalleryTileItem;
  span?: string;
  isNew?: boolean;
}) {
  const label = item.kind === "video" ? "Vídeo" : "Foto";
  return (
    <li className={`relative overflow-hidden rounded-2xl bg-block ${span}`} data-media={item.id}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs, already sized */}
      <img
        src={item.thumbUrl}
        alt={label}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      {isNew && (
        <span className="absolute top-2 left-2 rounded-full border-b-2 border-sun-deep bg-sun px-2 py-0.5 text-[11px] font-black text-sun-ink">
          Nova
        </span>
      )}
      {item.kind === "video" && (
        <span className="absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink">
          <PlayIcon className="h-4 w-4" />
        </span>
      )}
      <a
        href={item.downloadUrl}
        className="absolute right-1.5 bottom-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white focus-visible:outline-2 focus-visible:outline-white"
        aria-label={`Baixar ${label.toLowerCase()} original`}
      >
        <DownloadIcon className="h-4 w-4" strokeWidth={2.4} />
      </a>
    </li>
  );
}
