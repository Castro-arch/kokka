import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth-guard";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · Kokka" };

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold text-brand">Kokka</h1>
          <p className="text-sm text-stone-600">Área do organizador</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
