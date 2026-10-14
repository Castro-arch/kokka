interface EventHeaderProps {
  name: string;
  subtitle: string | null;
  /** Event theme: the header is always painted with the event's own color. */
  color: string;
  onColor: string;
  fontClass: string;
  coverUrl: string | null;
  live: boolean;
}

/**
 * Big guest header (docs/design, "Convidado · Enviar"): event color, name in the theme font and
 * the Kokka mascot inviting guests to take part. A cover photo, when set, sits under the color.
 */
export function EventHeader({
  name,
  subtitle,
  color,
  onColor,
  fontClass,
  coverUrl,
  live,
}: EventHeaderProps) {
  return (
    <header
      className="relative overflow-hidden rounded-b-[28px]"
      style={{ backgroundColor: color, color: onColor }}
    >
      {coverUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 opacity-80" style={{ backgroundColor: color }} />
        </>
      )}
      <div className="relative flex items-end gap-2 px-5 pt-7 pb-6">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1.5">
          {live && (
            <span className="self-start rounded-full bg-white/25 px-2.5 py-1 text-xs font-extrabold tracking-wider uppercase">
              Ao vivo agora
            </span>
          )}
          <h1 className={`text-[32px] leading-[1.05] font-black break-words ${fontClass}`}>
            {name}
          </h1>
          {subtitle && <p className="text-[17px] font-extrabold">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="max-w-32 rounded-[14px_14px_4px_14px] border-2 border-ink bg-white px-3 py-2 text-[13px] leading-tight font-extrabold text-ink">
            Bora registrar a festa?
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
          <img src="/brand/mascot.png" alt="" className="h-18 w-23 object-contain" />
        </div>
      </div>
    </header>
  );
}
