/** Reads a text field from FormData; missing fields and file inputs become "". */
export function formString(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
