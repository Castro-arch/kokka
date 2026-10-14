"use client";

import { useEffect, useState } from "react";
import { GalleryTile, mosaicSpan, type GalleryTileItem } from "./gallery-tile";

interface GalleryLiveProps {
  slug: string;
  initial: GalleryTileItem[];
  /** Live updates only on the first page; older pages stay as they were loaded. */
  live: boolean;
  emptyMessage: string;
}

/**
 * The gallery mosaic. Items rendered by the server come in as props; while the page is open, newly
 * ready items appear on top marked "Nova" and hidden or deleted ones disappear, through
 * server-sent events.
 */
export function GalleryLive({ slug, initial, live, emptyMessage }: GalleryLiveProps) {
  const [items, setItems] = useState(initial);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!live) return;
    const source = new EventSource(`/api/e/${slug}/stream`);
    source.addEventListener("ready", (event) => {
      const item = JSON.parse((event as MessageEvent<string>).data) as GalleryTileItem;
      setItems((current) =>
        current.some((existing) => existing.id === item.id) ? current : [item, ...current],
      );
      setFresh((current) => new Set(current).add(item.id));
    });
    source.addEventListener("removed", (event) => {
      const { id } = JSON.parse((event as MessageEvent<string>).data) as { id: string };
      setItems((current) => current.filter((existing) => existing.id !== id));
    });
    return () => {
      source.close();
    };
  }, [slug, live]);

  if (items.length === 0) {
    return (
      <div
        className="block-card flex flex-col items-center gap-2 p-6 text-center"
        data-gallery-empty
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
        <img src="/brand/mascot.png" alt="" className="h-16 w-20 object-contain" />
        <p className="font-extrabold text-ink-soft">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <ul className="grid grid-flow-dense auto-rows-[104px] grid-cols-3 gap-2" data-gallery>
      {items.map((item, index) => (
        <GalleryTile
          key={item.id}
          item={item}
          span={mosaicSpan(index)}
          isNew={fresh.has(item.id)}
        />
      ))}
    </ul>
  );
}
