/**
 * On/off setting with a title and a hint, on a native checkbox exposed as `role="switch"`.
 * With `soon`, it is disabled and hints "Em breve".
 */
export function Switch({
  label,
  hint,
  name,
  defaultChecked = false,
  soon = false,
}: {
  label: string;
  hint?: string;
  name: string;
  defaultChecked?: boolean;
  soon?: boolean;
}) {
  return (
    <label
      title={soon ? "Em breve" : undefined}
      className={`flex items-center justify-between gap-3 ${soon ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="flex flex-col">
        <span className="text-[15px] font-black">{label}</span>
        {hint && <span className="text-[13px] font-bold text-ink-soft">{hint}</span>}
      </span>
      <span className="relative flex h-11 shrink-0 items-center">
        <input
          type="checkbox"
          role="switch"
          name={name}
          defaultChecked={defaultChecked}
          disabled={soon}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative h-8 w-14 rounded-full border-b-4 border-line-strong bg-line transition-colors peer-checked:border-ok-edge peer-checked:bg-ok peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-brand-strong after:absolute after:top-1 after:left-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-6"
        />
      </span>
    </label>
  );
}
