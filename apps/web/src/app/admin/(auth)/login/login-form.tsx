"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/admin/button";
import { Field, fieldClassName } from "@/components/admin/field";
import { authClient } from "@/lib/auth-client";
import { formString } from "@/lib/form";

interface SignInState {
  email: string;
  error: string | null;
}

const INITIAL: SignInState = { email: "", error: null };

/**
 * Sign-in through Better Auth's client, as a form action so the button can follow the pending
 * state with useFormStatus.
 */
export function LoginForm() {
  const router = useRouter();
  const [state, signIn] = useActionState(async (_previous: SignInState, form: FormData) => {
    const email = formString(form, "email");
    const { error } = await authClient.signIn.email({
      email,
      password: formString(form, "password"),
    });
    if (error) {
      return {
        // The form is reset after the action; keep the e-mail so only the password is retyped.
        email,
        error:
          error.status === 429
            ? "Muitas tentativas. Aguarde um minuto e tente de novo."
            : "E-mail ou senha inválidos.",
      };
    }
    router.replace("/admin");
    router.refresh();
    return { email, error: null };
  }, INITIAL);
  const { error } = state;

  return (
    <form
      action={signIn}
      className="flex w-full flex-col gap-4 rounded-3xl border-2 border-b-[6px] border-line bg-white p-5.5"
    >
      <Field label="E-mail">
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          aria-invalid={error ? true : undefined}
          className={fieldClassName}
        />
      </Field>
      <Field label="Senha">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          className={fieldClassName}
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm font-extrabold text-brand-edge">
          {error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

/** Follows the form it sits in: "Entrando…" and disabled while the sign-in runs. */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}
