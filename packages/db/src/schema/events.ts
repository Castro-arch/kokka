import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { eventStatus } from "./enums.ts";

export interface EventTheme {
  primaryColor?: string;
  font?: string;
  coverKey?: string;
}

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    subtitle: text("subtitle"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: eventStatus("status").notNull().default("draft"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    theme: jsonb("theme").$type<EventTheme>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("events_slug_idx").on(table.slug)],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
