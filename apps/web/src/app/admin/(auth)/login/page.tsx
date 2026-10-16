import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth-guard";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Kokka" };

/** Admin sign-in, in the admin look (tokens and components of docs/design/admin). */
export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");

  return (
    <main className="admin-ui flex min-h-dvh items-center justify-center bg-block px-4 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
          <img src="/brand/mascot.png" alt="" className="h-18 w-23 object-contain" />
          <h1 className="text-[32px] font-black">Entrar no Kokka</h1>
          <p className="text-[15px] font-bold text-ink-soft">Área do organizador</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
