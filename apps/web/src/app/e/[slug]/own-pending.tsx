"use client";

import type { MediaKind, MediaStatus } from "@kokka/shared";
import { CheckIcon } from "@/components/icons";
import { LocalPreview } from "./local-preview";
import { useLocalPreviews } from "./local-previews";

export interface OwnPendingItem {
  id: string;
  kind: MediaKind;
  status: MediaStatus;
  /** Signed thumbnail, once the worker made one. */
  thumbUrl?: string;
}

const BADGES: Partial<Record<MediaStatus, { label: string; tile: string; badge: string }>> = {
  uploading: {
    label: "Enviando",
    tile: "bg-[#ffd7de] border-active-line",
    badge: "text-brand-edge",
  },
  processing: {
    label: "Preparando",
    tile: "bg-[#ffe3b8] border-[#f2c27a]",
    badge: "text-[#6b4300]",
  },
  ready: { label: "Na galeria", tile: "bg-[#cfe9ff] border-[#9ccbf2]", badge: "text-[#0b5a2a]" },
  failed: { label: "Falhou", tile: "bg-block border-line", badge: "text-brand-edge" },
};

/**
 * "Enviados por você" (docs/design): this phone's uploads with where each one is. In the session
 * that sent them they show the photo from the phone; ready ones show the server thumbnail.
 */
export function OwnPending({
  items,
  title = "Enviados por você",
}: {
  items: OwnPendingItem[];
  title?: string;
}) {
  const previews = useLocalPreviews();
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="own-uploads">
      <div className="flex items-baseline justify-between">
        <h2 id="own-uploads" className="text-lg font-black">
          {title}
        </h2>
        <span className="text-sm font-extrabold text-ink-soft">
          {items.length} {items.length === 1 ? "envio" : "envios"}
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-2.5">
        {items.map((item) => {
          const badge = BADGES[item.status] ?? BADGES.processing;
          const url =
            item.thumbUrl ?? (item.status === "failed" ? undefined : previews.get(item.id));
          return (
            <li
              key={item.id}
              className={`relative h-23 overflow-hidden rounded-2xl border-2 border-b-[5px] ${badge?.tile ?? ""}`}
            >
              {url && (
                <LocalPreview
                  url={url}
                  kind={item.thumbUrl ? "image" : item.kind}
                  className="h-full w-full"
                />
              )}
              <span
                className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-black ${badge?.badge ?? ""}`}
              >
                {item.status === "ready" && <CheckIcon className="h-3 w-3" strokeWidth={3.2} />}
                {badge?.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
