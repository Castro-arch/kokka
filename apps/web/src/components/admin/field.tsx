import type { ReactNode } from "react";

/** Input, select and textarea look of the admin forms (docs/design/admin/configuracoes.html). */
export const fieldClassName =
  "h-[52px] w-full rounded-2xl border-2 border-b-4 border-line bg-block px-4 text-base font-extrabold text-ink placeholder:text-ink-mute focus:border-active-line disabled:cursor-not-allowed disabled:opacity-60";

/** Label above its control, with an optional hint or error below. */
export function Field({
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
    <label className="flex flex-col gap-1.5 text-[15px] font-black">
      {label}
      {children}
      {error ? (
        <span className="text-sm font-extrabold text-brand-edge">{error}</span>
      ) : (
        hint && <span className="text-sm font-bold text-ink-soft">{hint}</span>
      )}
    </label>
  );
}
