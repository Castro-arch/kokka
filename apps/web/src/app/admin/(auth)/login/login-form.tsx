"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { formString } from "@/lib/form";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const { error: signInError } = await authClient.signIn.email({
      email: formString(form, "email"),
      password: formString(form, "password"),
    });
    if (signInError) {
      setError(
        signInError.status === 429
          ? "Muitas tentativas. Aguarde um minuto e tente de novo."
          : "Email ou senha inválidos.",
      );
      setPending(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="username" required className="input" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
