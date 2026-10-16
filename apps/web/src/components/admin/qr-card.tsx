import { buttonClassName } from "@/components/admin/button";
import { CopyLinkButton } from "@/components/admin/copy-link-button";

/** "QR das mesas": the event's real QR code, its link and the print card download. */
export function QrCard({
  eventId,
  url,
  svg,
  className = "",
}: {
  eventId: string;
  url: string;
  /** SVG markup generated on the server by the qrcode library from our own URL. */
  svg: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="qr-title"
      className={`flex flex-col items-center gap-3.5 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5 text-center ${className}`}
    >
      <h2 id="qr-title" className="self-start text-[19px] font-black">
        QR das mesas
      </h2>
      <div
        role="img"
        aria-label="QR Code do evento"
        className="h-46 w-46 rounded-[18px] border-2 border-line bg-white p-3.5 [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="text-sm font-extrabold break-all text-ink-soft">{displayUrl(url)}</span>
      <a
        href={`/api/admin/eventos/${eventId}/arte?download=1`}
        download
        className={buttonClassName({ className: "w-full" })}
      >
        Baixar arte para imprimir
      </a>
      <CopyLinkButton url={url} className="h-[46px] w-full text-[15px]" />
    </section>
  );
}

/** The link as people read it: no protocol. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
