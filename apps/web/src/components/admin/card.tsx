import type { HTMLAttributes, ReactNode } from "react";

/** White block card with the thicker bottom edge (docs/design/admin, "Assinatura visual"). */
export function Card({
  as: Tag = "section",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article"; children: ReactNode }) {
  return (
    <Tag
      className={`rounded-[22px] border-2 border-b-[6px] border-line bg-white p-[18px] ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Card heading at the size every admin card uses. */
export function CardTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={`text-[19px] font-black ${className}`}>{children}</h2>;
}
