import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth-guard";
import { SignOutButton } from "./sign-out-button";

/**
 * Admin shell (docs/design, "Admin · Eventos"): a sidebar with the logo, the sections and a tip
 * from the mascot; on phones it becomes a bar above the content.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-block lg:flex-row">
      <aside
        aria-label="Menu"
        className="flex shrink-0 flex-wrap items-center gap-4 border-b-2 border-line bg-white px-4 py-3 lg:w-62 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-5 lg:border-r-2 lg:border-b-0 lg:px-4.5 lg:py-6"
      >
        <Link href="/admin" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
          <img src="/brand/logo-light.png" alt="Kokka" className="h-8 w-auto lg:h-auto lg:w-37.5" />
        </Link>

        <nav aria-label="Seções" className="flex flex-1 gap-2 lg:flex-none lg:flex-col">
          <Link
            href="/admin/eventos"
            aria-current="page"
            className="flex h-11 items-center gap-3 rounded-2xl border-2 border-b-4 border-active-line bg-active px-3.5 font-black text-brand-deep lg:h-13 lg:text-base"
          >
            <CalendarIcon className="h-6 w-6" strokeWidth={2.4} />
            Eventos
          </Link>
        </nav>

        <div className="hidden flex-col gap-2 rounded-[18px] border-2 border-b-[5px] border-sun-line bg-sun-soft p-3.5 text-sun-text lg:mt-auto lg:flex">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
          <img src="/brand/mascot.png" alt="" className="h-12.5 w-16 object-contain" />
          <span className="font-black">Dica do Kokka</span>
          <span className="text-sm leading-snug font-bold">
            Imprima o QR em A6 e deixe um em cada mesa. Quanto mais perto, mais fotos.
          </span>
        </div>

        <div className="flex items-center gap-2 lg:flex-col lg:items-stretch">
          <span className="hidden truncate text-sm font-bold text-ink-soft sm:inline lg:text-center">
            {user.email}
          </span>
          <SignOutButton className="btn-secondary h-11 text-sm" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-8">
        <div className="mx-auto max-w-270">{children}</div>
      </main>
    </div>
  );
}
