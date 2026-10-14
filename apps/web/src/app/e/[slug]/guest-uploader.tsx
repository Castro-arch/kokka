"use client";

import type { ChangeEvent } from "react";
import { CameraIcon, CheckIcon, ImagesIcon, VideoIcon } from "./icons";
import { LocalPreview } from "./local-preview";
import { useUploads } from "./upload-context";

/** Photo/video picker and upload progress for guests; the uploads live in the event layout. */
export function GuestUploader({ color, onColor }: { color: string; onColor: string }) {
  const { items, send, retry } = useUploads();

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    send(files);
  }

  const button =
    "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl px-3 py-3 text-center text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2";

  return (
    <section className="mt-5 px-4" aria-labelledby="upload-title">
      <h2 id="upload-title" className="sr-only">
        Enviar fotos e vídeos
      </h2>
      <div className="flex gap-2">
        <label
          className={button}
          style={{ backgroundColor: color, color: onColor, outlineColor: color }}
        >
          <CameraIcon className="h-7 w-7" />
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
          className={button}
          style={{ backgroundColor: color, color: onColor, outlineColor: color }}
        >
          <VideoIcon className="h-7 w-7" />
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
          className={`${button} border border-stone-300 bg-white text-stone-800`}
          style={{ outlineColor: color }}
        >
          <ImagesIcon className="h-7 w-7" />
          Da galeria
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
        <ul className="mt-3 space-y-2" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg bg-stone-100 p-2 text-sm"
            >
              <LocalPreview
                url={item.previewUrl}
                kind={item.kind}
                className="h-12 w-12 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-stone-800">{item.label}</span>
                  <span className="shrink-0 text-stone-600">
                    {item.state === "sending" && `${item.percent}%`}
                    {item.state === "done" && (
                      <span className="inline-flex items-center gap-1">
                        Enviado <CheckIcon className="h-4 w-4" />
                      </span>
                    )}
                    {item.state === "error" && item.uppyId && (
                      <button
                        type="button"
                        onClick={() => void retry(item)}
                        className="font-semibold underline"
                      >
                        Tentar de novo
                      </button>
                    )}
                  </span>
                </div>
                {item.state === "sending" && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${item.percent}%`, backgroundColor: color }}
                    />
                  </div>
                )}
                {item.state === "done" && (
                  <p className="mt-0.5 text-xs text-stone-600">
                    Aparece na galeria assim que ficar pronto.
                  </p>
                )}
                {item.message && <p className="mt-0.5 text-xs text-red-700">{item.message}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
