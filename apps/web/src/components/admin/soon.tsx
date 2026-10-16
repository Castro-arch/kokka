import type { ReactNode } from "react";

/**
 * Features without a backend yet stay visible but inert: `aria-disabled` (still focusable, so the
 * hint can be read), faded, no hover or press, and a visible "Em breve" — a `title` alone never
 * shows on a phone. Regular buttons get a pill on their top right corner; small buttons and trail
 * nodes get a dot whose tooltip shows on hover and focus. When one notice on the screen already
 * explains it, controls take `hideBadge` and point at that notice with `describedBy` instead.
 */

/** Props shared by the primitives that can be "Em breve". */
export interface SoonProps {
  /** Feature without a backend yet: visible but inert, marked "Em breve". */
  soon?: boolean;
  /** Skip the per-control badge; a notice on the screen explains it (see `describedBy`). */
  hideBadge?: boolean;
  /** Id of the element that explains why the control is inert (used with `hideBadge`). */
  describedBy?: string;
}
export const SOON_CONTROL = "cursor-not-allowed opacity-55";

/** Wraps a control with the "Em breve" pill; the control points at it with aria-describedby. */
export function SoonPill({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      <span
        id={id}
        className="pointer-events-none absolute -top-2.5 -right-2 rounded-full border-2 border-white bg-sun-soft px-2 py-0.5 text-[11px] font-black whitespace-nowrap text-sun-text"
      >
        Em breve
      </span>
    </span>
  );
}

/** Wraps a small control with a dot and an "Em breve" tooltip shown on hover and focus. */
export function SoonDot({
  id,
  round = false,
  className = "",
  children,
}: {
  id: string;
  /** Round control: the dot sits on the edge of the circle, not on its bounding box corner. */
  round?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`group/soon relative inline-flex ${className}`}>
      {children}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-sun ${round ? "top-1.5 right-1.5" : "-top-1 -right-1"}`}
      />
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1 text-xs font-black whitespace-nowrap text-white group-focus-within/soon:block group-hover/soon:block"
      >
        Em breve
      </span>
    </span>
  );
}

/** Inline "Em breve" pill, next to the label of a disabled field or group. */
export function SoonTag({ id, className = "ml-2" }: { id?: string; className?: string }) {
  return (
    <span
      id={id}
      className={`${className} inline-block rounded-full bg-sun-soft px-2 py-0.5 align-middle text-[11px] font-black whitespace-nowrap text-sun-text`}
    >
      Em breve
    </span>
  );
}
