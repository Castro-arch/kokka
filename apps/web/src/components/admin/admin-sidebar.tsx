"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { SignOutButton } from "@/app/admin/(panel)/sign-out-button";
import {
  CalendarIcon,
  CloseIcon,
  LogOutIcon,
  MenuIcon,
  MonitorIcon,
  PhotoIcon,
  SlidersIcon,
} from "@/components/icons";
import { eventIdFromPath, sectionFromPath, type AdminSection } from "@/lib/admin-nav";

interface NavItem {
  section: AdminSection;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Undefined when the item needs an event and there is none yet. */
  href: string | undefined;
}

const ITEM = "flex h-[52px] items-center gap-3 rounded-2xl px-3.5 text-base transition-colors";

/**
 * Dark admin sidebar (docs/design/admin): sections, the mascot's tip and the signed-in user. From
 * 900px down it is a top bar whose sections open from a menu button.
 *
 * Telão and Mídias act on the event in the URL; elsewhere on `fallbackEventId` (the live event,
 * else the most recent one). Without any event they are shown disabled.
 */
export function AdminSidebar({
  user,
  fallbackEventId,
}: {
  user: { name: string; email: string };
  fallbackEventId: string | undefined;
}) {
  const pathname = usePathname();
  const active = sectionFromPath(pathname);
  const eventId = eventIdFromPath(pathname) ?? fallbackEventId;
  // The menu stays open only on the path it was opened on, so any navigation (links, back and
  // forward) closes it without resetting state in an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      menuButton.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const items: NavItem[] = [
    { section: "eventos", label: "Eventos", Icon: CalendarIcon, href: "/admin" },
    {
      section: "telao",
      label: "Telão",
      Icon: MonitorIcon,
      href: eventId && `/admin/eventos/${eventId}/telao`,
    },
    {
      section: "midias",
      label: "Mídias",
      Icon: PhotoIcon,
      href: eventId && `/admin/eventos/${eventId}/midias`,
    },
    {
      section: "configuracoes",
      label: "Configurações",
      Icon: SlidersIcon,
      href: "/admin/configuracoes",
    },
  ];

  return (
    <div className="sticky top-0 z-30 bg-side wide:static wide:w-64 wide:shrink-0">
      <aside
        aria-label="Menu"
        className="flex flex-col gap-3 px-4 py-3 text-white wide:sticky wide:top-0 wide:h-dvh wide:gap-6 wide:overflow-y-auto wide:py-6.5"
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-xl px-1.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
            <img src="/brand/mascot.png" alt="" className="h-9 w-11.5 object-contain" />
            <span className="text-[26px] leading-9 font-black text-white">Kokka</span>
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            onClick={() => {
              setOpenOn(menuOpen ? null : pathname);
            }}
            className="flex h-11 min-w-11 items-center gap-2 rounded-xl px-3 font-black text-side-text hover:bg-side-chip hover:text-white wide:hidden"
          >
            {menuOpen ? (
              <CloseIcon className="h-6 w-6" strokeWidth={2.4} />
            ) : (
              <MenuIcon className="h-6 w-6" strokeWidth={2.4} />
            )}
            {menuOpen ? "Fechar" : "Menu"}
          </button>
        </div>

        <div
          id="admin-menu"
          className={`${menuOpen ? "flex" : "hidden"} flex-col gap-6 pb-2 wide:flex wide:flex-1 wide:pb-0`}
        >
          <nav aria-label="Seções" className="flex flex-col gap-1.5">
            {items.map(({ section, label, Icon, href }) => {
              const current = section === active;
              if (!href) {
                return (
                  <span
                    key={section}
                    aria-disabled="true"
                    title="Crie um evento primeiro"
                    className={`${ITEM} cursor-not-allowed font-extrabold text-side-text opacity-50`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.4} />
                    {label}
                  </span>
                );
              }
              return (
                <Link
                  key={section}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  onClick={() => {
                    setOpenOn(null);
                  }}
                  className={`${ITEM} no-underline ${
                    current
                      ? "border-b-[5px] border-brand-edge bg-brand-strong font-black text-white"
                      : "font-extrabold text-side-text hover:bg-side-chip hover:text-white"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.4} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden flex-col gap-2 rounded-[18px] border-2 border-b-[5px] border-sun-line bg-sun-soft p-3.5 wide:flex">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
            <img src="/brand/mascot.png" alt="" className="h-11 w-14 object-contain" />
            <span className="text-[15px] font-black text-sun-ink">Dica do Kokka</span>
            <span className="text-sm leading-[1.35] font-bold text-sun-text">
              Imprima o QR em A6 e deixe um em cada mesa. Quanto mais perto, mais fotos.
            </span>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl bg-side-chip p-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun font-black text-sun-ink"
            >
              {initial(user.name || user.email)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-black text-white">{user.name}</span>
              <span className="truncate text-[13px] font-bold text-side-mute">{user.email}</span>
            </div>
            <SignOutButton
              label="Sair"
              className="-mx-1.5 -my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-side-mute hover:bg-side hover:text-white"
            >
              <LogOutIcon className="h-5 w-5" strokeWidth={2.4} />
            </SignOutButton>
          </div>
        </div>
      </aside>
    </div>
  );
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}
