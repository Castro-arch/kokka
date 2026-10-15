import type { AdminMediaItem } from "@/lib/admin-media";

/**
 * The 16:9 projector preview (docs/design/admin/telao.html): the item on screen with its place in
 * the loop, or, without media, the opening screen with the event name and the QR.
 */
export function ProjectorPreview({
  current,
  position,
  total,
  eventName,
  qrSvg,
  link,
}: {
  current: AdminMediaItem | undefined;
  /** 1-based place of `current` in the loop. */
  position: number;
  total: number;
  eventName: string;
  /** SVG markup generated on the server by the qrcode library from our own URL. */
  qrSvg: string;
  link: string;
}) {
  const progress = total > 0 ? `${String((position / total) * 100)}%` : "0%";
  const kind = current?.kind === "video" ? "Vídeo" : "Foto";

  return (
    <section
      aria-label="Prévia do telão"
      className="relative box-content flex aspect-video items-center justify-center overflow-hidden rounded-3xl border-b-8 border-stage-edge bg-stage"
    >
      {current ? (
        <>
          {/* Phones: smaller and lower, so the chip above never covers it. */}
          <div className="relative h-[56%] w-[44%] translate-y-[10%] overflow-hidden rounded-xl bg-linear-135 from-tile-rose to-tile-peach sm:h-[78%] sm:w-[56%] sm:translate-y-0">
            {current.thumbUrl && (
              // Signed, short-lived URL to a private bucket: next/image cannot optimize or cache it.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.thumbUrl}
                alt={kind}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
          <span className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 text-[13px] font-black text-white">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />
            {kind} {position} de {total}
          </span>
          <div
            role="progressbar"
            aria-label="Posição no loop"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={position}
            className="absolute right-4 bottom-4 left-4 h-2 overflow-hidden rounded-full bg-white/18"
          >
            <div className="h-full rounded-full bg-sun" style={{ width: progress }} />
          </div>
        </>
      ) : (
        <div className="flex items-center gap-[4%] px-[6%] text-white">
          <div
            role="img"
            aria-label="QR Code do evento"
            className="aspect-square w-[28%] shrink-0 rounded-2xl bg-white p-[2%] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-[clamp(20px,3.4vw,44px)] leading-[1.05] font-black">
              {eventName}
            </span>
            <span className="text-[clamp(13px,1.4vw,18px)] font-extrabold text-side-text">
              Aponte a câmera para o QR e mande suas fotos e vídeos.
            </span>
            <span className="text-[clamp(11px,1.1vw,14px)] font-bold break-all text-side-mute">
              {link}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
