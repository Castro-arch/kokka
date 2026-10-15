"use client";

import { useActionState } from "react";
import { Button } from "@/components/admin/button";
import { Field, fieldClassName } from "@/components/admin/field";
import type { FormState } from "@/lib/form";

interface EventFormProps {
  action: (state: FormState | null, form: FormData) => Promise<FormState>;
  /** Called as the name or subtitle is typed, for a live preview next to the form. */
  onTextChange?: (field: "name" | "subtitle", value: string) => void;
  initialValues?: Record<string, string>;
  submitLabel: string;
}

export function EventForm({
  action,
  onTextChange,
  initialValues = {},
  submitLabel,
}: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const values = state?.values ?? initialValues;
  const errors = state?.errors ?? {};

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5 sm:p-6"
    >
      <Field label="Nome do evento" error={errors.name}>
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Ex.: Ana & Pedro"
          onChange={(event) => onTextChange?.("name", event.target.value)}
          defaultValue={values.name}
          className={fieldClassName}
        />
      </Field>
      <Field
        label="Subtítulo (opcional)"
        hint="Ex.: Casamento · 21 de novembro"
        error={errors.subtitle}
      >
        <input
          name="subtitle"
          maxLength={160}
          onChange={(event) => onTextChange?.("subtitle", event.target.value)}
          defaultValue={values.subtitle}
          className={fieldClassName}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início" error={errors.startsAt}>
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={values.startsAt}
            className={fieldClassName}
          />
        </Field>
        <Field label="Término" error={errors.endsAt}>
          <input
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={values.endsAt}
            className={fieldClassName}
          />
        </Field>
      </div>
      <p className="text-sm font-bold text-ink-soft">Horários de Brasília.</p>
      {errors.form && (
        <p role="alert" className="text-sm font-extrabold text-brand-edge">
          {errors.form}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        {state?.message && !pending && (
          <p role="status" className="text-sm font-extrabold text-ok-text">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
