"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({
  className,
  label,
  children = "Sair",
}: {
  className?: string;
  /** Accessible name when the button shows only an icon. */
  label?: string;
  children?: ReactNode;
}) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      aria-label={label}
      title={label}
      className={className}
    >
      {children}
    </button>
  );
}
