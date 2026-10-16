import type { EventStatus } from "@kokka/shared";
import { STATUS_LABELS } from "@/lib/event-display";

const TONES: Record<EventStatus, { chip: string; dot: string }> = {
  draft: { chip: "border-line-strong bg-white text-ink-soft", dot: "bg-line-dash" },
  active: { chip: "border-ok-line bg-ok-soft text-ok-text", dot: "bg-ok" },
  closed: { chip: "border-sun-line bg-sun-soft text-sun-text", dot: "bg-sun-edge" },
  expired: { chip: "border-line bg-block text-ink-mute", dot: "bg-ink-mute" },
};

/** Event status pill: Rascunho, Ativo, Encerrado or Expirado. */
export function StatusChip({ status }: { status: EventStatus }) {
  const tone = TONES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[13px] font-black ${tone.chip}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}
