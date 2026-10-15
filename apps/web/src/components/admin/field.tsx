import { cloneElement, useId, type ReactElement } from "react";

/**
 * Input, select and textarea look of the admin forms (docs/design/admin/configuracoes.html). A
 * field marked invalid (Field sets aria-invalid on errors) turns red with the brand edge below.
 */
export const fieldClassName =
  "h-[52px] w-full rounded-2xl border-2 border-b-4 border-line bg-block px-4 text-base font-extrabold text-ink placeholder:text-ink-mute focus:border-active-line disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-brand-strong aria-invalid:border-b-brand-edge";

/**
 * A value shown in field shape but not editable: no fill, dashed border, no thick bottom edge.
 * Use with readOnly and tabIndex={-1}: screen readers still read it, Tab skips it.
 */
export const readOnlyFieldClassName =
  "h-[52px] w-full cursor-default rounded-2xl border-2 border-dashed border-line bg-transparent px-4 text-base font-extrabold text-ink-soft focus:outline-none";

interface ControlProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * Label above its control, with an optional hint or error below. Only the label names the control;
 * the hint or error describes it (aria-describedby), and an error marks it invalid.
 */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<ControlProps>;
}) {
  const noteId = useId();
  const note = error ?? hint;
  const describedBy =
    [children.props["aria-describedby"], note ? noteId : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-[15px] font-black">
        {label}
        {cloneElement(children, {
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
        })}
      </label>
      {note && (
        <span
          id={noteId}
          className={
            error ? "text-sm font-extrabold text-brand-edge" : "text-sm font-bold text-ink-soft"
          }
        >
          {note}
        </span>
      )}
    </div>
  );
}
