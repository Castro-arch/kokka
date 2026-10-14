"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { CameraIcon, CheckIcon, ImagesIcon, VideoIcon } from "./icons";
import { LocalPreview } from "./local-preview";
import { useUploads } from "./upload-context";

interface GuestUploaderProps {
  /** Event theme color, its darker edge and the text color legible on it. */
  color: string;
  colorEdge: string;
  onColor: string;
}

/**
 * Big picker buttons and the progress of each upload (docs/design, "Convidado · Enviar"). The
 * uploads themselves live in the event layout.
 */
export function GuestUploader({ color, colorEdge, onColor }: GuestUploaderProps) {
  const { items, send, retry } = useUploads();

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    send(files);
  }

  const block =
    "flex cursor-pointer items-center justify-center rounded-[22px] font-black focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-brand active:translate-y-0.5 active:border-b-[3px]";
  const themed: CSSProperties = { backgroundColor: color, color: onColor, borderColor: colorEdge };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="upload-title">
      <h2 id="upload-title" className="sr-only">
        Enviar fotos e vídeos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <label className={`${block} h-32 flex-col gap-2.5 border-b-[6px] text-lg`} style={themed}>
          <CameraIcon className="h-10 w-10" strokeWidth={2.2} />
          Tirar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onPick}
          />
        </label>
        <label
          className={`${block} h-32 flex-col gap-2.5 border-b-[6px] border-sun-deep bg-sun text-lg text-sun-ink`}
        >
          <VideoIcon className="h-10 w-10" strokeWidth={2.2} />
          Gravar vídeo
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            onChange={onPick}
          />
        </label>
        <label
          className={`${block} col-span-2 h-16 gap-2.5 border-2 border-b-[6px] border-line bg-white text-[17px] text-ink`}
        >
          <ImagesIcon className="h-6.5 w-6.5" strokeWidth={2.2} />
          Escolher da galeria
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={onPick}
          />
        </label>
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2.5" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-[18px] border-2 border-b-[5px] border-line bg-block p-3"
            >
              <LocalPreview
                url={item.previewUrl}
                kind={item.kind}
                className="h-13 w-13 shrink-0 rounded-xl"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-[15px] font-black">
                  <span className="truncate">{item.label}</span>
                  {item.state === "sending" && (
                    <span className="text-brand-deep">{item.percent}%</span>
                  )}
                  {item.state === "done" && (
                    <span className="inline-flex items-center gap-1 text-[#0b5a2a]">
                      Enviado <CheckIcon className="h-4 w-4" strokeWidth={3} />
                    </span>
                  )}
                  {item.state === "error" && item.uppyId && (
                    <button
                      type="button"
                      onClick={() => void retry(item)}
                      className="text-brand-deep underline"
                    >
                      Tentar de novo
                    </button>
                  )}
                </div>
                {item.state === "sending" && (
                  <>
                    <div className="h-3 overflow-hidden rounded-full border-2 border-line bg-white">
                      <div
                        className="h-full rounded-full bg-brand-strong transition-[width]"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-bold text-ink-soft">
                      Pode fechar a câmera, a gente continua enviando.
                    </span>
                  </>
                )}
                {item.state === "done" && (
                  <span className="text-[13px] font-bold text-ink-soft">
                    Aparece na galeria assim que ficar pronto.
                  </span>
                )}
                {item.message && (
                  <span className="text-[13px] font-bold text-brand-deep">{item.message}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
