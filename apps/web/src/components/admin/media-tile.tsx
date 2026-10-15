import { toneClass } from "@/components/admin/media-thumb";
import { CheckIcon, EyeOffIcon } from "@/components/icons";
import type { AdminMediaItem } from "@/lib/admin-media";
import { formatDuration } from "@/lib/media-filters";

/**
 * One tile of the media screen (docs/design/admin/midias.html). The whole tile is the label of
 * its checkbox, so a tap anywhere selects it; hidden, failed and processing media say so on top.
 */
export function MediaTile({
  item,
  label,
  selected,
  onToggle,
}: {
  item: AdminMediaItem;
  /** Accessible name of the checkbox, e.g. "Selecionar foto 3". */
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const failed = item.status === "failed";
  const hidden = item.status === "hidden";

  return (
    <label
      className={`relative block aspect-square cursor-pointer rounded-[18px] has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-brand-strong ${
        failed ? "border-2 border-dashed border-active-line bg-block" : toneClass(item.id)
      } ${
        selected
          ? "border-4 border-brand-strong shadow-[0_0_0_4px_var(--color-active)]"
          : failed
            ? ""
            : "border-2 border-transparent"
      }`}
    >
      {item.thumbUrl && (
        // Signed, short-lived URL to a private bucket: next/image cannot optimize or cache it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full rounded-[14px] object-cover"
        />
      )}

      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-[9px] text-white ${
          selected
            ? "border-b-[3px] border-brand-edge bg-brand-strong"
            : "border-2 border-line-strong bg-white/92"
        }`}
      >
        {selected && <CheckIcon className="h-4 w-4" strokeWidth={3.4} />}
      </span>

      {hidden && (
        <span className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-ink/55 text-white">
          <EyeOffIcon className="h-8.5 w-8.5" strokeWidth={2.4} />
        </span>
      )}

      {item.kind === "video" && item.durationMs !== null && !hidden && !failed && (
        <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-ink/78 px-2 py-0.75 text-xs font-black text-white">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current">
            <path d="M6 4v16l14-8z" />
          </svg>
          <span className="sr-only">Vídeo de </span>
          {formatDuration(item.durationMs)}
        </span>
      )}

      {hidden && <StatusBadge className="bg-ink text-white">Oculta</StatusBadge>}
      {failed && <StatusBadge className="bg-active text-brand-edge">Falhou</StatusBadge>}
      {item.status === "processing" && (
        <StatusBadge className="bg-white text-ink-soft">Processando</StatusBadge>
      )}
    </label>
  );
}

function StatusBadge({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`absolute bottom-2 left-2 z-10 rounded-full px-2.25 py-0.75 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}
