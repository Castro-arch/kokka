"use server";

import { eventInputSchema } from "@kokka/shared";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { createEvent } from "@/lib/events";
import { fieldErrors, formValues, type FormState } from "@/lib/form";

const EVENT_FIELDS = ["name", "subtitle", "startsAt", "endsAt"] as const;

export async function createEventAction(_state: FormState | null, form: FormData) {
  await requireAdmin();
  const values = formValues(form, EVENT_FIELDS);
  const parsed = eventInputSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) } satisfies FormState;

  await createEvent(parsed.data);
  redirect("/admin/eventos");
}
