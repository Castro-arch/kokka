"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/admin/button";
import { Field, fieldClassName, readOnlyFieldClassName } from "@/components/admin/field";
import { MIN_PASSWORD_LENGTH } from "@/lib/account";
import type { FormState } from "@/lib/form";
import { changePasswordAction, updateNameAction } from "./actions";

/**
 * "Sua conta" (docs/design/admin/configuracoes.html): the name is saved for real, the e-mail is
 * read only (changing it needs verification), and "Trocar senha" opens a modal dialog.
 */
export function AccountCard({
  name,
  email,
  passwordChanged,
}: {
  name: string;
  email: string;
  /** The password action redirected back here after a successful change. */
  passwordChanged: boolean;
}) {
  const [nameState, saveName, savingName] = useActionState(updateNameAction, null);
  const [passwordState, changePassword, changingPassword] = useActionState(
    changePasswordAction,
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const currentName = nameState?.values.name ?? name;

  // The redirect after a successful change is a soft navigation: the dialog would stay open.
  useEffect(() => {
    if (passwordChanged) dialog.current?.close();
  }, [passwordChanged]);

  const passwordErrors = passwordState?.errors ?? {};

  return (
    <section
      aria-labelledby="account-title"
      className="flex flex-[1_1_408px] flex-col gap-4 rounded-3xl border-2 border-b-[6px] border-line bg-white p-5.5"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className="box-content flex h-15 w-15 items-center justify-center rounded-full border-b-[5px] border-sun-edge bg-sun text-2xl font-black text-sun-ink"
        >
          {(currentName.trim() || email).charAt(0).toUpperCase()}
        </span>
        <h2 id="account-title" className="text-[21px] font-black">
          Sua conta
        </h2>
      </div>

      <form action={saveName} className="flex flex-col gap-4">
        <Field label="Nome" error={nameState?.errors.name}>
          <input
            name="name"
            required
            maxLength={60}
            autoComplete="name"
            defaultValue={currentName}
            className={fieldClassName}
          />
        </Field>
        <Field label="E-mail" hint="O e-mail de acesso não muda por aqui.">
          <input
            type="email"
            value={email}
            readOnly
            tabIndex={-1}
            className={readOnlyFieldClassName}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" disabled={savingName}>
            {savingName ? "Salvando…" : "Salvar"}
          </Button>
          <Button
            variant="outline"
            aria-haspopup="dialog"
            onClick={() => dialog.current?.showModal()}
          >
            Trocar senha
          </Button>
        </div>
        <Status state={nameState} pending={savingName} />
        {passwordChanged && (
          <p role="status" className="text-sm font-extrabold text-ok-text">
            Senha trocada. Os outros aparelhos conectados foram desconectados.
          </p>
        )}
      </form>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[22px] border-2 border-b-[6px] border-line bg-white p-6 text-ink backdrop:bg-ink/55"
      >
        <form action={changePassword} className="flex flex-col gap-4">
          {/* Lets password managers tie the new password to this account. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <h2 id={titleId} className="text-[22px] font-black">
            Trocar senha
          </h2>
          <p className="text-[15px] font-bold text-ink-soft">
            Depois da troca, os outros aparelhos conectados saem da conta.
          </p>
          <Field label="Senha atual" error={passwordErrors.currentPassword}>
            <input
              type="password"
              name="currentPassword"
              required
              autoComplete="current-password"
              className={fieldClassName}
            />
          </Field>
          <Field
            label="Nova senha"
            hint={`Pelo menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`}
            error={passwordErrors.newPassword}
          >
            <input
              type="password"
              name="newPassword"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className={fieldClassName}
            />
          </Field>
          <Field label="Confirme a nova senha" error={passwordErrors.confirmPassword}>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className={fieldClassName}
            />
          </Field>
          {passwordErrors.form && (
            <p role="alert" className="text-sm font-extrabold text-brand-edge">
              {passwordErrors.form}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => dialog.current?.close()}
              disabled={changingPassword}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? "Trocando…" : "Trocar senha"}
            </Button>
          </div>
        </form>
      </dialog>
    </section>
  );
}

/** Inline result of an action: success in green; field errors show next to their fields. */
function Status({ state, pending }: { state: FormState | null; pending: boolean }) {
  if (pending || !state) return null;
  if (state.message) {
    return (
      <p role="status" className="text-sm font-extrabold text-ok-text">
        {state.message}
      </p>
    );
  }
  if (state.errors.form) {
    return (
      <p role="alert" className="text-sm font-extrabold text-brand-edge">
        {state.errors.form}
      </p>
    );
  }
  return null;
}
