"use client";

import type { MediaKind, MediaStatus } from "@kokka/shared";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
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
  useFinishedUploads(items);
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

/**
 * While some of this phone's uploads are still on their way, listens to the event's live stream
 * and reloads the page data when one of them is ready or failed, so "Preparando" turns into
 * "Na galeria" or "Falhou" without a reload. No connection when nothing is pending.
 */
function useFinishedUploads(items: OwnPendingItem[]) {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const pending = items
    .filter((item) => item.status === "uploading" || item.status === "processing")
    .map((item) => item.id)
    .join(",");

  useEffect(() => {
    if (!pending) return;
    const ids = new Set(pending.split(","));
    const source = new EventSource(`/api/e/${slug}/stream`);
    const onFinished = (event: Event) => {
      const { id } = JSON.parse((event as MessageEvent<string>).data) as { id: string };
      if (ids.has(id)) router.refresh();
    };
    source.addEventListener("ready", onFinished);
    source.addEventListener("failed", onFinished);
    // Anything that finished before the stream was listening (page load, reconnects) would never
    // arrive as an event: catch up once each time it (re)opens.
    source.addEventListener("open", () => {
      router.refresh();
    });
    return () => {
      source.close();
    };
  }, [pending, slug, router]);
}
