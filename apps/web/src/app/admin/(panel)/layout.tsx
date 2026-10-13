import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth-guard";
import { SignOutButton } from "./sign-out-button";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="text-xl font-bold text-brand">
            Kokka
          </Link>
          <div className="flex items-center gap-3 text-sm text-stone-600">
            <span className="hidden sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
