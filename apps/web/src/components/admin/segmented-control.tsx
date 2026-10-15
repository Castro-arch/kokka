export interface SegmentOption {
  value: string;
  label: string;
}

/**
 * Single choice among a few options, built on native radios (keyboard and forms for free). With
 * `soon`, the whole group is disabled and hints "Em breve".
 */
export function SegmentedControl({
  label,
  name,
  options,
  defaultValue,
  soon = false,
  className = "",
}: {
  label: string;
  name: string;
  options: SegmentOption[];
  defaultValue?: string;
  soon?: boolean;
  className?: string;
}) {
  return (
    <fieldset
      disabled={soon}
      title={soon ? "Em breve" : undefined}
      className={`min-w-0 ${className}`}
    >
      <legend className="mb-2 text-[15px] font-black">{label}</legend>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${String(options.length)}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <label key={option.value} className="group relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="peer sr-only"
            />
            <span className="flex h-[46px] cursor-pointer items-center justify-center rounded-[14px] border-2 border-b-4 border-line bg-white text-[15px] font-black text-ink peer-checked:border-active-line peer-checked:bg-active peer-checked:text-brand-edge peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-brand-strong peer-disabled:cursor-not-allowed">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
