"use server";

import { eventInputSchema, themeInputSchema } from "@kokka/shared";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { createEvent, mergeEventTheme, transitionEvent, updateEvent } from "@/lib/events";
import { fieldErrors, formValues, type FormState } from "@/lib/form";

const EVENT_FIELDS = ["name", "subtitle", "startsAt", "endsAt"] as const;

const THEME_FIELDS = ["primaryColor", "font"] as const;

const targetStatus = z.enum(["active", "closed"]);

export async function createEventAction(_state: FormState | null, form: FormData) {
  await requireAdmin();
  const values = formValues(form, EVENT_FIELDS);
  const parsed = eventInputSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) } satisfies FormState;

  const event = await createEvent(parsed.data);
  redirect(`/admin/eventos/${event.id}`);
}

export async function updateEventAction(id: string, _state: FormState | null, form: FormData) {
  await requireAdmin();
  const values = formValues(form, EVENT_FIELDS);
  const parsed = eventInputSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) } satisfies FormState;

  if (!(await updateEvent(id, parsed.data))) {
    return {
      values,
      errors: { form: "Este evento não pode mais ser editado." },
    } satisfies FormState;
  }
  refresh();
  return { values, errors: {}, message: "Alterações salvas." } satisfies FormState;
}

export async function transitionEventAction(
  id: string,
  to: string,
  _state: string | null,
  _form: FormData,
): Promise<string | null> {
  await requireAdmin();
  const target = targetStatus.safeParse(to);
  if (!target.success || !(await transitionEvent(id, target.data))) {
    return "O status do evento mudou em outra aba. Recarregue a página.";
  }
  refresh();
  return null;
}

export async function updateThemeAction(id: string, _state: FormState | null, form: FormData) {
  await requireAdmin();
  const values = formValues(form, THEME_FIELDS);
  const parsed = themeInputSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) } satisfies FormState;

  if (!(await mergeEventTheme(id, parsed.data))) {
    return {
      values,
      errors: { form: "Este evento não pode mais ser editado." },
    } satisfies FormState;
  }
  refresh();
  return { values, errors: {}, message: "Personalização salva." } satisfies FormState;
}
