import type { Event } from "@kokka/db";
import { EVENT_RETENTION_DAYS, expiresAtFor, type EventStatus } from "@kokka/shared";
import { formatDayMonth, formatDayMonthTime, shortTime } from "./event-display";

export type StepState = "done" | "current" | "todo";

export interface LifecycleStep {
  status: EventStatus;
  label: string;
  state: StepState;
  /** Real or planned date of the step, or "agora" for the live one. */
  date: string;
}

export interface Lifecycle {
  steps: LifecycleStep[];
  /** How much of the line between the first and the last step is filled, 0 to 1. */
  progress: number;
  note: string;
}

const ORDER: EventStatus[] = ["draft", "active", "closed", "expired"];

const LABELS: Record<EventStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  closed: "Encerrado",
  expired: "Apagado",
};

type LifecycleEvent = Pick<
  Event,
  "status" | "createdAt" | "startsAt" | "endsAt" | "closedAt" | "expiresAt"
>;

/** When the files go away: the stored date, or the one closing at the planned end would give. */
function deletionDate(event: LifecycleEvent): Date | null {
  if (event.expiresAt) return event.expiresAt;
  const closing = event.closedAt ?? event.endsAt;
  return closing ? expiresAtFor(closing) : null;
}

/**
 * "Ciclo do evento" (docs/design/admin/evento.html): the four steps with real dates (created,
 * started, closed or planned end, deletion) and a line filled up to the current step.
 */
export function buildLifecycle(event: LifecycleEvent): Lifecycle {
  const current = ORDER.indexOf(event.status);
  const closing = event.closedAt ?? event.endsAt;
  const deletion = deletionDate(event);

  const dates: Record<EventStatus, string> = {
    draft: formatDayMonth(event.createdAt),
    active:
      event.status === "active" ? "agora" : event.startsAt ? formatDayMonth(event.startsAt) : "—",
    closed: closing ? formatDayMonthTime(closing) : "—",
    expired: deletion ? formatDayMonth(deletion) : "—",
  };

  const steps = ORDER.map((status, index) => ({
    status,
    label: LABELS[status],
    // The last step has nothing after it: once there, it is done, not in progress.
    state:
      index < current || event.status === "expired"
        ? ("done" as const)
        : index === current
          ? ("current" as const)
          : ("todo" as const),
    date: dates[status],
  }));

  const days = String(EVENT_RETENTION_DAYS);
  const notes: Record<EventStatus, string> = {
    draft: "Ative o evento para os convidados começarem a enviar.",
    active: event.endsAt
      ? `Os envios fecham às ${shortTime(event.endsAt)}. Depois, tudo fica ${days} dias para baixar.`
      : `Depois de encerrado, tudo fica ${days} dias para baixar.`,
    closed: `Envios fechados. Tudo fica disponível para baixar até ${dates.expired}.`,
    expired: `As fotos e os vídeos foram apagados em ${dates.expired}.`,
  };

  return { steps, progress: current / (ORDER.length - 1), note: notes[event.status] };
}
