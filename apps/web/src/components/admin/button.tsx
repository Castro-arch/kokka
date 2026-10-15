import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "sun" | "outline" | "ghost-on-brand";
export type ButtonSize = "md" | "lg";

/** Chunky block buttons (docs/design/admin): a darker bottom edge that flattens when pressed. */
const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2.5 font-black no-underline transition-[background-color,transform,border-width] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0";

const SIZES: Record<ButtonSize, string> = {
  md: "h-[50px] rounded-2xl px-5 text-base border-b-[5px] active:border-b-[3px]",
  lg: "h-[54px] rounded-[18px] px-[22px] text-[17px] border-b-[6px] active:border-b-4",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-brand-edge bg-brand-strong text-white hover:bg-brand-dark",
  sun: "border-sun-edge bg-sun text-sun-ink hover:brightness-[0.97]",
  outline: "border-2 border-line bg-white text-ink hover:bg-block",
  "ghost-on-brand": "border-2 border-white/60 bg-transparent text-white hover:bg-white/10",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`;
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    /** Feature without a backend yet: visible but disabled, with "Em breve" as its hint. */
    soon?: boolean;
  };

export function Button({
  variant,
  size,
  className,
  soon = false,
  type = "button",
  disabled,
  title,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={soon || disabled}
      title={soon ? "Em breve" : title}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  href,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={buttonClassName({ variant, size, className })}>
      {children}
    </Link>
  );
}
