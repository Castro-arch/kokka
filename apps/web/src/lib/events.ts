import "server-only";
import { and, desc, eq, events, sql, type Event, type EventTheme, type NewEvent } from "@kokka/db";
import {
  expiresAtFor,
  generateSlug,
  previousAdminStatus,
  type AdminTargetStatus,
  type EventInput,
} from "@kokka/shared";
import { cache } from "react";
import { z } from "zod";
import { getDb } from "./db";

const SLUG_INDEX = "events_slug_idx";
const SLUG_ATTEMPTS = 5;

const eventId = z.uuid();

/** Every event, newest first; memoized per request (the layout and the page both need it). */
export const listEvents = cache((): Promise<Event[]> =>
  getDb().select().from(events).orderBy(desc(events.createdAt)),
);

/** Undefined for unknown or malformed ids, so callers can 404 without a database error. */
export async function getEvent(id: string): Promise<Event | undefined> {
  if (!eventId.safeParse(id).success) return undefined;
  const [event] = await getDb().select().from(events).where(eq(events.id, id));
  return event;
}

/** Expired events are read-only. Returns the updated event, or undefined if nothing changed. */
export async function updateEvent(id: string, input: EventInput): Promise<Event | undefined> {
  if (!eventId.safeParse(id).success) return undefined;
  const [event] = await getDb()
    .update(events)
    .set(input)
    .where(and(eq(events.id, id), sql`${events.status} <> 'expired'`))
    .returning();
  return event;
}

/**
 * Merges `patch` into the theme in a single statement, so saving colors and uploading a cover at
 * the same time never overwrite each other. Expired events are read-only.
 */
export async function mergeEventTheme(
  id: string,
  patch: Partial<EventTheme>,
): Promise<Event | undefined> {
  if (!eventId.safeParse(id).success) return undefined;
  const [event] = await getDb()
    .update(events)
    .set({ theme: sql`${events.theme} || ${JSON.stringify(patch)}::jsonb` })
    .where(and(eq(events.id, id), sql`${events.status} <> 'expired'`))
    .returning();
  return event;
}

/**
 * Moves an event one step forward. The update only matches the expected previous status, so a
 * stale page or a replayed request can never skip or reverse a step. Closing also starts the
 * retention clock.
 */
export async function transitionEvent(
  id: string,
  to: AdminTargetStatus,
  now = new Date(),
): Promise<Event | undefined> {
  if (!eventId.safeParse(id).success) return undefined;
  const changes =
    to === "closed" ? { status: to, closedAt: now, expiresAt: expiresAtFor(now) } : { status: to };
  const [event] = await getDb()
    .update(events)
    .set(changes)
    .where(and(eq(events.id, id), eq(events.status, previousAdminStatus(to))))
    .returning();
  return event;
}

export function createEvent(values: Omit<NewEvent, "id" | "slug">): Promise<Event> {
  return withUniqueSlug(async (slug) => {
    const [event] = await getDb()
      .insert(events)
      .values({ ...values, slug })
      .returning();
    if (!event) throw new Error("Insert returned no row");
    return event;
  });
}

/** Runs `attempt` with fresh slugs until it does not hit the unique slug index. */
export async function withUniqueSlug<T>(
  attempt: (slug: string) => Promise<T>,
  generate: () => string = generateSlug,
): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await attempt(generate());
    } catch (error) {
      if (i >= SLUG_ATTEMPTS || !isUniqueViolation(error, SLUG_INDEX)) throw error;
    }
  }
}

/** Postgres unique violation on `constraint`; Drizzle wraps the driver error in `cause`. */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    const pg = current as Error & { code?: string; constraint_name?: string };
    if (pg.code === "23505") return pg.constraint_name === constraint;
  }
  return false;
}
