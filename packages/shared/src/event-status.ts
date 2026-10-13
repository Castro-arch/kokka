import { EVENT_RETENTION_DAYS, type EventStatus } from "./constants.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The only move the admin can make from each status. Events never go back; `expired` is set
 * by the lifecycle job, never by the admin.
 */
const NEXT_ADMIN_STATUS = {
  draft: "active",
  active: "closed",
  closed: null,
  expired: null,
} as const satisfies Record<EventStatus, EventStatus | null>;

export type AdminTargetStatus = NonNullable<(typeof NEXT_ADMIN_STATUS)[EventStatus]>;

export function nextAdminStatus(status: EventStatus): AdminTargetStatus | null {
  return NEXT_ADMIN_STATUS[status];
}

/** The status an event must be in for the admin to move it to `to`. */
export function previousAdminStatus(to: AdminTargetStatus): EventStatus {
  return to === "active" ? "draft" : "active";
}

/** Media of a closed event is deleted this long after closing. */
export function expiresAtFor(closedAt: Date): Date {
  return new Date(closedAt.getTime() + EVENT_RETENTION_DAYS * DAY_MS);
}
