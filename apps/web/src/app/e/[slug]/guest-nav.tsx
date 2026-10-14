"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, HeartIcon, UploadIcon } from "@/components/icons";

/** Bottom navigation of the guest area; links, so it works before JavaScript loads. */
export function GuestNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/e/${slug}`, label: "Enviar", Icon: UploadIcon },
    { href: `/e/${slug}/galeria`, label: "Galeria", Icon: GridIcon },
    { href: `/e/${slug}/meus`, label: "Meus envios", Icon: HeartIcon },
  ];

  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-3 gap-1.5 px-3 pt-2">
        {tabs.map(({ href, label, Icon }) => {
          const current = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex h-15 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 text-[13px] font-black focus-visible:outline-2 focus-visible:outline-brand ${
                current
                  ? "border-active-line bg-active text-brand-deep"
                  : "border-transparent text-ink-soft hover:bg-block"
              }`}
            >
              <Icon className="h-6.5 w-6.5" strokeWidth={2.4} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
