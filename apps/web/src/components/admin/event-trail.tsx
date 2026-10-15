import Link from "next/link";
import { CheckIcon, DownloadIcon, MonitorIcon, PencilIcon } from "@/components/icons";
import { SOON_CONTROL, SoonDot } from "@/components/admin/soon";
import type { TrailItem } from "@/lib/event-trail";

/**
 * "Sua trilha" (docs/design/admin/eventos.html): events on a dashed center line, nodes sitting on
 * the line and zigzagging, text on the opposite side. Below 900px it becomes a single column with
 * smaller nodes on a line at the left.
 */
export function EventTrail({ items }: { items: TrailItem[] }) {
  return (
    <section
      aria-labelledby="trail-title"
      className="flex flex-col gap-3.5 rounded-[26px] border-2 border-b-[6px] border-line bg-white px-6 pt-5.5 pb-7.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="trail-title" className="text-xl font-black">
          Sua trilha
        </h2>
        <span className="text-sm font-extrabold text-ink-soft">
          Do próximo evento ao mais antigo
        </span>
      </div>
      <ol className="relative flex flex-col gap-7 before:absolute before:top-8 before:bottom-8 before:left-[38px] before:-ml-1 before:w-2 before:rounded-full before:bg-[repeating-linear-gradient(var(--color-line)_0_16px,transparent_16px_28px)] wide:gap-4.5 wide:before:top-10 wide:before:bottom-10 wide:before:left-1/2">
        {items.map((item) => (
          <TrailNode key={item.id} item={item} />
        ))}
      </ol>
    </section>
  );
}

/** Horizontal nudge of each node off the line, alternating like the mockup's zigzag. */
function nodeShift(item: TrailItem): string {
  if (item.status === "expired") {
    return item.side === "left" ? "wide:-translate-x-4.5" : "wide:translate-x-4.5";
  }
  return item.side === "left" ? "wide:-translate-x-6.5" : "wide:translate-x-6.5";
}

export function TrailNode({ item }: { item: TrailItem }) {
  const textLeft = item.side === "left";
  const expired = item.status === "expired";
  return (
    <li className="relative grid grid-cols-[76px_minmax(0,1fr)] items-center gap-x-4 wide:grid-cols-[minmax(0,1fr)_168px_minmax(0,1fr)] wide:gap-x-4.5">
      <div
        className={`col-start-2 row-start-1 flex flex-col items-start ${
          textLeft ? "wide:col-start-1 wide:items-end wide:text-right" : "wide:col-start-3"
        }`}
      >
        <Link
          href={`/admin/eventos/${item.id}`}
          className={`font-black text-ink no-underline hover:text-ink hover:underline ${
            expired ? "text-[17px] text-ink-soft hover:text-ink-soft" : "text-lg"
          }`}
        >
          {item.name}
        </Link>
        <span className={`text-sm font-extrabold ${expired ? "text-ink-mute" : "text-ink-soft"}`}>
          {item.meta}
        </span>
        {item.action && (
          <Link
            href={item.action.href}
            className="text-sm font-black text-brand-strong no-underline hover:text-brand-dark hover:underline"
          >
            {item.action.label}
          </Link>
        )}
        {item.deletion && (
          <span className="mt-1 rounded-full bg-active px-2.5 py-0.75 text-xs font-black text-brand-edge">
            {item.deletion}
          </span>
        )}
      </div>
      <div
        className={`col-start-1 row-start-1 flex justify-center wide:col-start-2 ${nodeShift(item)}`}
      >
        <NodeShape item={item} />
      </div>
    </li>
  );
}

function NodeShape({ item }: { item: TrailItem }) {
  switch (item.status) {
    case "draft":
      return (
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-dashed border-line-dash bg-white text-ink-soft wide:h-22 wide:w-22"
        >
          <PencilIcon className="h-6.5 w-6.5 wide:h-8.5 wide:w-8.5" strokeWidth={2.4} />
        </span>
      );
    case "active":
      return (
        <span
          aria-hidden="true"
          className="relative flex h-19 w-19 items-center justify-center rounded-full border-b-[7px] border-brand-edge bg-brand-strong text-white shadow-[0_0_0_5px_var(--color-active)] wide:h-26 wide:w-26 wide:border-b-[9px] wide:shadow-[0_0_0_7px_var(--color-active)]"
        >
          <MonitorIcon className="h-8 w-8 wide:h-10.5 wide:w-10.5" strokeWidth={2.4} />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-b-[3px] border-sun-edge bg-sun px-2.5 py-0.75 text-xs font-black whitespace-nowrap text-sun-ink wide:-top-3.25">
            HOJE
          </span>
        </span>
      );
    case "closed":
      return (
        <SoonDot id={`soon-zip-${item.id}`} round>
          <button
            type="button"
            aria-disabled="true"
            aria-describedby={`soon-zip-${item.id}`}
            aria-label={`Baixar ZIP de ${item.name}`}
            className={`${SOON_CONTROL} flex h-16 w-16 items-center justify-center rounded-full border-b-[6px] border-sun-edge bg-sun text-sun-ink wide:h-22 wide:w-22 wide:border-b-8`}
          >
            <DownloadIcon className="h-7 w-7 wide:h-9 wide:w-9" strokeWidth={2.6} />
          </button>
        </SoonDot>
      );
    case "expired":
      return (
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full border-b-[6px] border-line-strong bg-line text-ink-mute wide:h-18 wide:w-18 wide:border-b-[7px]"
        >
          <CheckIcon className="h-6.5 w-6.5 wide:h-7.5 wide:w-7.5" strokeWidth={2.8} />
        </span>
      );
  }
}
