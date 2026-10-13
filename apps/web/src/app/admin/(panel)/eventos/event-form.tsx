"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/form";

interface EventFormProps {
  action: (state: FormState | null, form: FormData) => Promise<FormState>;
  initialValues?: Record<string, string>;
  submitLabel: string;
}

export function EventForm({ action, initialValues = {}, submitLabel }: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initialValues;
  const errors = state?.errors ?? {};

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200"
    >
      <Field label="Nome do evento" error={errors.name}>
        <input name="name" required maxLength={120} defaultValue={values.name} className="input" />
      </Field>
      <Field
        label="Subtítulo (opcional)"
        hint="Ex.: 21 de novembro de 2026"
        error={errors.subtitle}
      >
        <input name="subtitle" maxLength={160} defaultValue={values.subtitle} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início" error={errors.startsAt}>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={values.startsAt}
            className="input"
          />
        </Field>
        <Field label="Término" error={errors.endsAt}>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={values.endsAt}
            className="input"
          />
        </Field>
      </div>
      <p className="text-xs text-stone-500">Horários de Brasília.</p>
      {errors.form && (
        <p role="alert" className="text-sm text-red-700">
          {errors.form}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-stone-500">{hint}</span>}
      {error && <span className="block text-sm text-red-700">{error}</span>}
    </label>
  );
}
