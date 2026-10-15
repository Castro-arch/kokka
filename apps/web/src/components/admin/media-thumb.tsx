import { PlayIcon } from "@/components/icons";
import type { AdminMediaItem } from "@/lib/admin-media";
import { tileTone, type TileTone } from "@/lib/media-tone";

const TONE_CLASSES: Record<TileTone, string> = {
  rose: "bg-tile-rose",
  sky: "bg-tile-sky",
  peach: "bg-tile-peach",
  mint: "bg-tile-mint",
  lilac: "bg-tile-lilac",
  lemon: "bg-tile-lemon",
};

export function toneClass(id: string): string {
  return TONE_CLASSES[tileTone(id)];
}

/**
 * Square preview of one upload: the thumbnail when the worker has made it, otherwise a pastel
 * tile picked from the id. No hooks, so server and client screens share it.
 */
export function MediaThumb({
  item,
  className = "",
}: {
  item: Pick<AdminMediaItem, "id" | "kind" | "status" | "thumbUrl">;
  className?: string;
}) {
  const label = item.kind === "video" ? "Vídeo" : "Foto";

  if (item.status === "processing" && !item.thumbUrl) {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-[14px] border-2 border-dashed border-line-strong bg-block text-center text-xs font-black text-ink-soft ${className}`}
      >
        processando
      </div>
    );
  }

  return (
    <div
      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] ${
        item.thumbUrl ? "bg-block" : toneClass(item.id)
      } ${className}`}
    >
      {item.thumbUrl ? (
        // Signed, short-lived URL to a private bucket: next/image cannot optimize or cache it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbUrl}
          alt={label}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="sr-only">{label}</span>
      )}
      {item.kind === "video" && (
        <PlayIcon
          className={`relative h-5.5 w-5.5 ${item.thumbUrl ? "text-white drop-shadow" : "text-tile-ink"}`}
        />
      )}
    </div>
  );
}
