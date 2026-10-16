"use client";

import { useState } from "react";
import { MediaTile } from "@/components/admin/media-tile";
import { SOON_CONTROL, SoonDot } from "@/components/admin/soon";
import type { AdminMediaItem } from "@/lib/admin-media";

const BAR_BUTTON =
  "h-[46px] rounded-[14px] px-4 text-[15px] font-black transition-transform disabled:cursor-not-allowed";

/** Press feedback, only on actions that do something. */
const PRESSABLE = "active:translate-y-0.5";

/** A bulk action that does nothing yet: inert, with the "Em breve" dot and tooltip. */
function SoonAction({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children: string;
}) {
  return (
    <SoonDot id={id} className="w-full sm:w-auto">
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={id}
        className={`${BAR_BUTTON} ${SOON_CONTROL} w-full ${className}`}
      >
        {children}
      </button>
    </SoonDot>
  );
}

/**
 * The media grid with selection and the bulk bar that appears once something is selected. Only
 * "Baixar" of a single ready item works for now; the rest is visible but "Em breve".
 */
export function MediaGrid({ eventId, items }: { eventId: string; items: AdminMediaItem[] }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const chosen = items.filter((item) => selected.has(item.id));
  const single = chosen.length === 1 ? chosen[0] : undefined;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <>
      <section
        aria-label="Grade de mídias"
        className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3"
      >
        {items.map((item, index) => (
          <MediaTile
            key={item.id}
            item={item}
            label={`Selecionar ${item.kind === "video" ? "vídeo" : "foto"} ${String(index + 1)}`}
            selected={selected.has(item.id)}
            onToggle={() => {
              toggle(item.id);
            }}
          />
        ))}
      </section>

      {chosen.length > 0 && (
        <div
          role="toolbar"
          aria-label="Ações em lote"
          className="sticky bottom-5 z-20 flex flex-wrap items-center gap-3 rounded-[22px] border-b-[6px] border-stage-edge bg-ink py-3 pr-3.5 pl-5 text-white shadow-[0_10px_30px_color-mix(in_srgb,var(--color-ink)_25%,transparent)]"
        >
          <span aria-live="polite" className="flex-auto text-[17px] font-black">
            {chosen.length === 1 ? "1 selecionada" : `${String(chosen.length)} selecionadas`}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelected(new Set());
            }}
            className="h-11 rounded-xl px-3 text-[15px] font-extrabold text-side-mute underline hover:text-white"
          >
            Limpar
          </button>
          {/* Phones: the three actions share a row under the count. */}
          <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:gap-3">
            {chosen.length > 1 ? (
              <SoonAction
                id="soon-download-many"
                className="border-2 border-b-[5px] border-ink-soft bg-side-chip text-white"
              >
                Baixar
              </SoonAction>
            ) : single?.status === "ready" ? (
              <a
                href={`/api/admin/eventos/${eventId}/midias/${single.id}/download`}
                className={`${BAR_BUTTON} ${PRESSABLE} flex items-center justify-center border-2 border-b-[5px] border-ink-soft bg-side-chip text-white no-underline hover:text-white`}
              >
                Baixar
              </a>
            ) : (
              <button
                type="button"
                disabled
                title="Só mídias prontas podem ser baixadas"
                className={`${BAR_BUTTON} border-2 border-b-[5px] border-ink-soft bg-side-chip text-white opacity-55`}
              >
                Baixar
              </button>
            )}
            <SoonAction
              id="soon-hide"
              className="border-b-[5px] border-sun-edge bg-sun text-sun-ink"
            >
              Ocultar
            </SoonAction>
            <SoonAction
              id="soon-delete"
              className="border-b-[5px] border-brand-edge bg-brand-strong text-white"
            >
              Apagar
            </SoonAction>
          </div>
        </div>
      )}
    </>
  );
}
