"use client";

import type { AdminTargetStatus } from "@kokka/shared";
import { useActionState } from "react";

const COPY = {
  active: {
    button: "Ativar evento",
    description: "Convidados passam a enviar fotos e vídeos pelo QR Code.",
    confirm: "Ativar o evento? Depois de ativo ele não volta a rascunho.",
    className: "btn-primary",
  },
  closed: {
    button: "Encerrar evento",
    description:
      "Bloqueia novos envios. A galeria e os downloads ficam disponíveis por 5 dias e depois tudo é apagado.",
    confirm:
      "Encerrar o evento? Novos envios serão bloqueados e as mídias serão apagadas em 5 dias. Não dá para desfazer.",
    className: "btn-danger",
  },
} satisfies Record<AdminTargetStatus, Record<string, string>>;

interface StatusControlProps {
  next: AdminTargetStatus;
  action: (state: string | null, form: FormData) => Promise<string | null>;
}

export function StatusControl({ next, action }: StatusControlProps) {
  const [error, formAction, pending] = useActionState(action, null);
  const copy = COPY[next];

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(copy.confirm)) event.preventDefault();
      }}
      className="space-y-2"
    >
      <p className="text-sm text-stone-600">{copy.description}</p>
      <button type="submit" disabled={pending} className={copy.className}>
        {pending ? "Aguarde…" : copy.button}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
