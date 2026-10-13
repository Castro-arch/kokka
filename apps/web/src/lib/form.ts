/** Reads a text field from FormData; missing fields and file inputs become "". */
export function formString(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** What a form Server Action returns when it does not redirect. */
export interface FormState {
  /** Submitted values, so the form keeps them after React resets it. */
  values: Record<string, string>;
  /** First error per field; `form` holds errors that belong to no field. */
  errors: Partial<Record<string, string>>;
}

export function formValues(form: FormData, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, formString(form, name)]));
}

/** Maps validation issues (e.g. a ZodError) to the first message of each top-level field. */
export function fieldErrors(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}
