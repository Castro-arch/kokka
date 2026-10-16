import { readableTextColor } from "@/lib/color";

/**
 * The event name and subtitle in its color and title font, as guests will see them. Theme
 * colors are event data, so they come in as inline styles rather than tokens.
 */
export function EventPreview({
  name,
  subtitle,
  color,
  fontClassName,
}: {
  name: string;
  subtitle: string | null;
  color: string;
  fontClassName: string;
}) {
  return (
    <div
      className="rounded-[18px] px-6 py-8 text-center"
      style={{ backgroundColor: color, color: readableTextColor(color) }}
    >
      <p className={`text-3xl font-bold break-words ${fontClassName}`}>
        {name.trim() || "Nome do evento"}
      </p>
      {subtitle?.trim() && <p className={`mt-1 break-words ${fontClassName}`}>{subtitle}</p>}
    </div>
  );
}
