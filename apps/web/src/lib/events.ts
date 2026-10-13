import "server-only";
import { desc, events, type Event, type NewEvent } from "@kokka/db";
import { generateSlug } from "@kokka/shared";
import { getDb } from "./db";

const SLUG_INDEX = "events_slug_idx";
const SLUG_ATTEMPTS = 5;

export function listEvents(): Promise<Event[]> {
  return getDb().select().from(events).orderBy(desc(events.createdAt));
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
