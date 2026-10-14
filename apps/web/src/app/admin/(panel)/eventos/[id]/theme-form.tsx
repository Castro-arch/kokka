"use client";

import { FONT_OPTIONS, type FontKey } from "@kokka/shared";
import { startTransition, useActionState, useState } from "react";
import { readableTextColor } from "@/lib/color";
import type { FormState } from "@/lib/form";

interface ThemeFormProps {
  action: (state: FormState | null, form: FormData) => Promise<FormState>;
  initial: { primaryColor: string; font: FontKey };
  fontClassNames: Record<FontKey, string>;
  preview: { name: string; subtitle: string | null };
}

export function ThemeForm({ action, initial, fontClassNames, preview }: ThemeFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [color, setColor] = useState(initial.primaryColor);
  const [font, setFont] = useState<FontKey>(initial.font);
  const errors = state?.errors ?? {};

  return (
    <form
      // Submitting through a transition skips React's automatic form reset, which would put the
      // controlled radios back on the font they had when the page loaded.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => {
          formAction(data);
        });
      }}
      className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200"
    >
      <div
        className="rounded-xl px-6 py-8 text-center"
        style={{ backgroundColor: color, color: readableTextColor(color) }}
      >
        <p className={`text-3xl font-bold ${fontClassNames[font]}`}>{preview.name}</p>
        {preview.subtitle && <p className={`mt-1 ${fontClassNames[font]}`}>{preview.subtitle}</p>}
      </div>

      <label className="flex items-center gap-3">
        <input
          type="color"
          name="primaryColor"
          value={color}
          onChange={(event) => {
            setColor(event.target.value);
          }}
          className="h-10 w-14 cursor-pointer rounded border border-stone-300"
        />
        <span className="text-sm font-medium">Cor principal</span>
        {errors.primaryColor && <span className="text-sm text-red-700">{errors.primaryColor}</span>}
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Fonte</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {FONT_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-300 px-3 py-2 has-checked:border-brand has-checked:ring-2 has-checked:ring-brand"
            >
              <input
                type="radio"
                name="font"
                value={option.key}
                checked={font === option.key}
                onChange={() => {
                  setFont(option.key);
                }}
                className="accent-brand"
              />
              <span className={`text-lg ${fontClassNames[option.key]}`}>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.font && <p className="text-sm text-red-700">{errors.font}</p>}
      </fieldset>

      {errors.form && (
        <p role="alert" className="text-sm text-red-700">
          {errors.form}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Salvando…" : "Salvar personalização"}
        </button>
        {state?.message && !pending && (
          <p role="status" className="text-sm text-green-700">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
