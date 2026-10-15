"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { EVENT_TABS, type EventTab } from "@/lib/event-tabs";

export const TAB_PANEL_ID = "event-tab-panel";

/**
 * The event page tabs (Visão geral, Personalização, QR e arte). Each tab is a link to `?aba=`, so
 * it works without JavaScript and survives reloads; arrow keys, Home and End move between tabs as
 * the ARIA tabs pattern expects. On narrow screens the row scrolls sideways without a scrollbar,
 * fades at the edge that has more tabs, and starts scrolled to the active tab.
 */
export function EventTabs({ eventId, active }: { eventId: string; active: EventTab }) {
  const router = useRouter();
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  useEffect(() => {
    const row = list.current;
    if (!row) return;
    const measure = () => {
      setOverflow({
        left: row.scrollLeft > 1,
        right: row.scrollLeft + row.clientWidth < row.scrollWidth - 1,
      });
    };
    // Bring the active tab into view without scrolling the page itself.
    const tab = refs.current[EVENT_TABS.findIndex((item) => item.key === active)];
    if (tab && tab.offsetLeft + tab.offsetWidth > row.clientWidth) {
      row.scrollLeft = tab.offsetLeft + tab.offsetWidth - row.clientWidth + 20;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    row.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      row.removeEventListener("scroll", measure);
    };
  }, [active]);
  const href = (tab: EventTab) =>
    tab === "visao" ? `/admin/eventos/${eventId}` : `/admin/eventos/${eventId}?aba=${tab}`;

  function onKeyDown(event: KeyboardEvent<HTMLAnchorElement>, index: number) {
    const last = EVENT_TABS.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    const tab = target === undefined ? undefined : EVENT_TABS[target];
    if (target === undefined || !tab) return;
    event.preventDefault();
    refs.current[target]?.focus();
    router.replace(href(tab.key), { scroll: false });
  }

  return (
    <div className="relative border-t-2 border-line">
      <div
        ref={list}
        role="tablist"
        aria-label="Seções do evento"
        className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-5 [&::-webkit-scrollbar]:hidden"
      >
        {EVENT_TABS.map((tab, index) => {
          const selected = tab.key === active;
          return (
            <Link
              key={tab.key}
              ref={(node) => {
                refs.current[index] = node;
              }}
              id={`event-tab-${tab.key}`}
              href={href(tab.key)}
              replace
              scroll={false}
              role="tab"
              aria-selected={selected}
              aria-controls={TAB_PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(event) => {
                onKeyDown(event, index);
              }}
              className={`flex h-[54px] shrink-0 items-center border-b-4 px-3.5 text-base font-black whitespace-nowrap no-underline ${
                selected
                  ? "border-brand-strong text-brand-edge hover:text-brand-edge"
                  : "border-transparent text-ink-soft hover:border-line hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-white transition-opacity ${overflow.left ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-linear-to-l from-white transition-opacity ${overflow.right ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
