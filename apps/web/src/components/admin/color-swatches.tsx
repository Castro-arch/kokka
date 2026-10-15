"use client";

import { THEME_COLOR_PRESETS } from "@kokka/shared";
import { useId, useState } from "react";
import { SoonTag, type SoonProps } from "@/components/admin/soon";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { darken, readableTextColor } from "@/lib/color";

const isPreset = (color: string) =>
  THEME_COLOR_PRESETS.some((preset) => preset.color === color.toLowerCase());

/**
 * Event color picker (docs/design/admin/configuracoes.html): the six suggested swatches as a
 * radio group, the chosen one ringed with a ✓, plus "Outra cor" that opens the native color
 * input. The form receives the hex in a hidden field named `name`. With `soon`, it is disabled
 * and hints "Em breve".
 */
export function ColorSwatches({
  name,
  label,
  value,
  onChange,
  soon = false,
  hideBadge = false,
  describedBy,
}: SoonProps & {
  name: string;
  label: string;
  value: string;
  onChange?: (color: string) => void;
}) {
  const groupName = useId();
  const [custom, setCustom] = useState(() => !isPreset(value));
  const color = value.toLowerCase();

  function choose(next: string, asCustom: boolean) {
    setCustom(asCustom);
    onChange?.(next);
  }

  const ring =
    "peer-checked:shadow-[0_0_0_3px_var(--color-white),0_0_0_6px_var(--color-ink)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-[9px] peer-focus-visible:outline-brand-strong";

  return (
    <fieldset
      disabled={soon}
      aria-describedby={soon && hideBadge ? describedBy : undefined}
      className={`min-w-0 ${soon ? "[&_label]:cursor-not-allowed" : ""}`}
    >
      <legend className="mb-2 text-[15px] font-black">
        {label}
        {soon && !hideBadge && <SoonTag />}
      </legend>
      <input type="hidden" name={name} value={color} />
      <div className={`flex flex-wrap items-center gap-2.5 ${soon ? "opacity-55" : ""}`}>
        {THEME_COLOR_PRESETS.map((preset) => (
          <label key={preset.color} className="relative cursor-pointer" title={preset.label}>
            <input
              type="radio"
              name={groupName}
              checked={!custom && color === preset.color}
              onChange={() => {
                choose(preset.color, false);
              }}
              aria-label={preset.label}
              className="peer sr-only"
            />
            {/* Preset colors are event data from @kokka/shared, applied inline. */}
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-b-[5px] text-white [&>svg]:hidden peer-checked:[&>svg]:block ${ring}`}
              style={{ backgroundColor: preset.color, borderColor: preset.edge }}
            >
              <CheckIcon className="h-5.5 w-5.5" strokeWidth={3.4} />
            </span>
          </label>
        ))}
        <label className="relative cursor-pointer" title="Outra cor">
          <input
            type="radio"
            name={groupName}
            checked={custom}
            onChange={() => {
              choose(color, true);
            }}
            aria-label="Outra cor"
            className="peer sr-only"
          />
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border-b-[5px] ${
              custom ? "" : "border-2 border-dashed border-line-strong bg-white text-ink-soft"
            } ${ring}`}
            style={
              custom
                ? {
                    backgroundColor: color,
                    borderColor: darken(color, 0.29),
                    color: readableTextColor(color),
                  }
                : undefined
            }
          >
            {custom ? (
              <CheckIcon className="h-5.5 w-5.5" strokeWidth={3.4} />
            ) : (
              <PlusIcon className="h-5.5 w-5.5" strokeWidth={2.8} />
            )}
          </span>
        </label>
        {custom && (
          <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-b-4 border-line bg-white pr-3 pl-1.5 text-sm font-black">
            <input
              type="color"
              value={color}
              onChange={(event) => {
                choose(event.target.value, true);
              }}
              className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
            />
            Outra cor
          </label>
        )}
      </div>
    </fieldset>
  );
}
