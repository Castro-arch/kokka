"use client";

import type { MediaKind, MediaStatus } from "@kokka/shared";
import { LocalPreview } from "./local-preview";
import { useLocalPreviews } from "./local-previews";

export interface OwnPendingItem {
  id: string;
  kind: MediaKind;
  status: MediaStatus;
}

const STATUS_LABEL: Partial<Record<MediaStatus, string>> = {
  uploading: "Enviando",
  processing: "Processando",
  failed: "Falhou",
};

/**
 * This device's uploads that are not in the gallery yet. In the session that sent them, they show
 * the photo from the phone; otherwise an icon.
 */
export function OwnPending({ items }: { items: OwnPendingItem[] }) {
  const previews = useLocalPreviews();
  if (items.length === 0) return null;

  return (
    <section className="mt-6 px-4" aria-labelledby="own-pending">
      <h2 id="own-pending" className="text-sm font-semibold text-stone-700">
        Enviados por você — processando
      </h2>
      <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <li key={item.id} className="relative h-20 w-20 shrink-0">
            <LocalPreview
              url={item.status === "failed" ? undefined : previews.get(item.id)}
              kind={item.kind}
              className="h-full w-full rounded-lg"
            />
            <span
              className={`absolute inset-x-0 bottom-0 rounded-b-lg px-1 py-0.5 text-center text-[11px] font-medium text-white ${item.status === "failed" ? "bg-red-700/90" : "bg-black/55"}`}
            >
              {STATUS_LABEL[item.status] ?? ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
