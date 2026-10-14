"use client";

import { useEffect, useState } from "react";
import { GalleryTile, type GalleryTileItem } from "./gallery-tile";

interface GalleryLiveProps {
  slug: string;
  initial: GalleryTileItem[];
  /** Live updates only on the first page; older pages stay as they were loaded. */
  live: boolean;
  emptyMessage: string;
}

/**
 * The gallery grid. Items rendered by the server come in as props; while the page is open, newly
 * ready items appear on top and hidden or deleted ones disappear, through server-sent events.
 */
export function GalleryLive({ slug, initial, live, emptyMessage }: GalleryLiveProps) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    if (!live) return;
    const source = new EventSource(`/api/e/${slug}/stream`);
    source.addEventListener("ready", (event) => {
      const item = JSON.parse((event as MessageEvent<string>).data) as GalleryTileItem;
      setItems((current) =>
        current.some((existing) => existing.id === item.id) ? current : [item, ...current],
      );
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
      <p className="py-10 text-center text-stone-600" data-gallery-empty>
        {emptyMessage}
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-3 gap-1.5" data-gallery>
      {items.map((item) => (
        <GalleryTile key={item.id} item={item} />
      ))}
    </ul>
  );
}
