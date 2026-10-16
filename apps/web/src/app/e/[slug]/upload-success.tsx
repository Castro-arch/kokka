"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useUploads } from "./upload-context";

/** Confetti bits around the mascot (positions from docs/design, "Envio concluído"). */
const CONFETTI = [
  "left-[34px] top-[70px] h-3.5 w-3.5 rounded bg-sun rotate-[20deg]",
  "left-[300px] top-[58px] h-3 w-3 rounded-full bg-brand-strong",
  "left-[330px] top-[170px] h-2 w-4 rounded bg-[#1f6feb] -rotate-[25deg]",
  "left-[52px] top-[210px] h-2.5 w-2.5 rounded-full bg-[#1f6feb]",
  "left-[282px] top-[260px] h-3.5 w-3.5 rounded bg-sun -rotate-[15deg]",
  "left-[92px] top-[34px] h-[7px] w-4 rounded bg-brand-strong rotate-[35deg]",
];

/**
 * "Mandou bem!" once a batch of uploads finishes, on whichever guest page is open
 * (docs/design, "Convidado · Envio concluído"). Counts are this page session's uploads.
 */
export function UploadSuccess({ slug }: { slug: string }) {
  const router = useRouter();
  const { items, celebrate, dismissCelebration } = useUploads();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (celebrate) heading.current?.focus();
  }, [celebrate]);

  if (!celebrate) return null;

  const done = items.filter((item) => item.state === "done");
  const photos = done.filter((item) => item.kind === "image").length;
  const videos = done.length - photos;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-success-title"
      className="fixed inset-0 z-30 overflow-y-auto bg-white"
    >
      <div className="relative mx-auto flex min-h-full max-w-[390px] flex-col items-center gap-5 px-6 pt-12 pb-8">
        {CONFETTI.map((bit) => (
          <span key={bit} aria-hidden className={`absolute ${bit}`} />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
        <img
          src="/brand/mascot.png"
          alt="Mascote do Kokka comemorando"
          className="relative h-39 w-50 object-contain"
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <h2
            id="upload-success-title"
            ref={heading}
            tabIndex={-1}
            className="text-4xl leading-[1.05] font-black text-brand-edge outline-none"
          >
            Mandou bem!
          </h2>
          <p className="max-w-72 text-lg leading-snug font-extrabold">
            Suas fotos já estão com a gente. Em instantes aparecem na galeria.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="flex flex-col rounded-[18px] border-2 border-b-[5px] border-sun-line bg-sun-soft p-3.5 text-sun-text">
            <span className="text-3xl font-black">{photos}</span>
            <span className="text-sm font-extrabold">
              {photos === 1 ? "foto enviada" : "fotos enviadas"}
            </span>
          </div>
          <div className="flex flex-col rounded-[18px] border-2 border-b-[5px] border-[#a9cbf5] bg-[#e3f0ff] p-3.5 text-[#0b3d7a]">
            <span className="text-3xl font-black">{videos}</span>
            <span className="text-sm font-extrabold">
              {videos === 1 ? "vídeo enviado" : "vídeos enviados"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex w-full flex-col gap-3 pt-4">
          <button
            type="button"
            onClick={dismissCelebration}
            className="btn-primary h-15 w-full text-lg"
          >
            Enviar mais
          </button>
          <button
            type="button"
            onClick={() => {
              dismissCelebration();
              router.push(`/e/${slug}/galeria`);
            }}
            className="btn-secondary h-15 w-full text-lg"
          >
            Ver galeria
          </button>
        </div>
      </div>
    </div>
  );
}
