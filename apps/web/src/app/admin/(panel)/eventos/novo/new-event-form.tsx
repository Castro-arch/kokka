"use client";

import { useState } from "react";
import { EventPreview } from "@/components/admin/event-preview";
import type { FormState } from "@/lib/form";
import { EventForm } from "../event-form";

/**
 * The create form with the Personalização preview card, updated as the name and subtitle are
 * typed, in the default event color and font. Beside the form from 900px, above it below that.
 */
export function NewEventForm({
  action,
  color,
  fontClassName,
}: {
  action: (state: FormState | null, form: FormData) => Promise<FormState>;
  color: string;
  fontClassName: string;
}) {
  const [text, setText] = useState({ name: "", subtitle: "" });

  return (
    <div className="grid items-start gap-5.5 wide:grid-cols-[minmax(0,1fr)_340px]">
      <section
        aria-labelledby="preview-title"
        className="flex flex-col gap-3 rounded-[22px] border-2 border-b-[6px] border-line bg-white p-4.5 wide:sticky wide:top-7 wide:order-last"
      >
        <h2 id="preview-title" className="text-[19px] font-black">
          Prévia
        </h2>
        <EventPreview
          name={text.name}
          subtitle={text.subtitle}
          color={color}
          fontClassName={fontClassName}
        />
        <p className="text-sm font-bold text-ink-soft">
          Cor e fonte padrão. Você muda na Personalização, depois de criar.
        </p>
      </section>
      <EventForm
        action={action}
        submitLabel="Criar evento"
        onTextChange={(field, value) => {
          setText((current) => ({ ...current, [field]: value }));
        }}
      />
    </div>
  );
}
