import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { exportStatus } from "./enums.ts";
import { events } from "./events.ts";

export const exports = pgTable(
  "exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: exportStatus("status").notNull().default("pending"),
    key: text("key"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("exports_event_idx").on(table.eventId)],
);

export type Export = typeof exports.$inferSelect;
export type NewExport = typeof exports.$inferInsert;
