"use client";

import { FONT_OPTIONS, type FontKey } from "@kokka/shared";
import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/admin/button";
import { ColorSwatches } from "@/components/admin/color-swatches";
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
      className="flex flex-col gap-5 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5 sm:p-6"
    >
      <div
        className="rounded-[18px] px-6 py-8 text-center"
        style={{ backgroundColor: color, color: readableTextColor(color) }}
      >
        <p className={`text-3xl font-bold ${fontClassNames[font]}`}>{preview.name}</p>
        {preview.subtitle && <p className={`mt-1 ${fontClassNames[font]}`}>{preview.subtitle}</p>}
      </div>

      <div>
        <ColorSwatches
          name="primaryColor"
          label="Cor principal"
          value={color}
          onChange={setColor}
        />
        {errors.primaryColor && (
          <p className="mt-2 text-sm font-extrabold text-brand-edge">{errors.primaryColor}</p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-[15px] font-black">Fonte do título</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {FONT_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex min-h-13 cursor-pointer items-center gap-3 rounded-[14px] border-2 border-b-4 border-line bg-white px-3.5 has-checked:border-active-line has-checked:bg-active has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-brand-strong"
            >
              <input
                type="radio"
                name="font"
                value={option.key}
                checked={font === option.key}
                onChange={() => {
                  setFont(option.key);
                }}
                className="h-5 w-5 accent-brand-strong focus-visible:outline-none"
              />
              <span className={`text-lg ${fontClassNames[option.key]}`}>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.font && (
          <p className="mt-2 text-sm font-extrabold text-brand-edge">{errors.font}</p>
        )}
      </fieldset>

      {errors.form && (
        <p role="alert" className="text-sm font-extrabold text-brand-edge">
          {errors.form}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar personalização"}
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
