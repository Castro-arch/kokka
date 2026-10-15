"use client";

import { EVENT_RETENTION_DAYS, type AdminTargetStatus } from "@kokka/shared";
import { useActionState, useEffect, useId, useRef } from "react";
import { Button } from "@/components/admin/button";

const COPY = {
  active: {
    button: "Ativar evento",
    title: "Ativar o evento?",
    body: (name: string) =>
      `Os convidados de ${name} passam a enviar pelo QR Code e o evento não volta a rascunho.`,
  },
  closed: {
    button: "Encerrar envios",
    title: "Encerrar os envios?",
    body: (name: string) =>
      `Os convidados de ${name} não poderão mais enviar. Tudo fica disponível para baixar por ${String(EVENT_RETENTION_DAYS)} dias e depois é apagado.`,
  },
} satisfies Record<AdminTargetStatus, unknown>;

interface StatusControlProps {
  eventName: string;
  next: AdminTargetStatus;
  action: (state: string | null, form: FormData) => Promise<string | null>;
}

/**
 * Moves the event one step forward (draft → active → closed) after a confirmation dialog. The
 * native modal dialog keeps focus inside it and closes on Escape; the server checks the step again.
 */
export function StatusControl({ eventName, next, action }: StatusControlProps) {
  const [error, formAction, pending] = useActionState(action, null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const copy = COPY[next];

  // Close once the action has finished; keep it open to show an error.
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !error) dialog.current?.close();
    wasPending.current = pending;
  }, [pending, error]);

  return (
    <>
      <Button
        variant={next === "active" ? "primary" : "outline"}
        className={next === "closed" ? "text-brand-edge!" : ""}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        {copy.button}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[22px] border-2 border-b-[6px] border-line bg-white p-6 text-ink backdrop:bg-ink/55"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <h2 id={titleId} className="text-[22px] font-black">
            {copy.title}
          </h2>
          <p id={bodyId} className="text-base font-bold text-ink-soft">
            {copy.body(eventName)}
          </p>
          {error && (
            <p role="alert" className="text-sm font-extrabold text-brand-edge">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button
              variant="outline"
              autoFocus
              onClick={() => dialog.current?.close()}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Aguarde…" : copy.button}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
