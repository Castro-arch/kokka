import { bigint, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { mediaKind, mediaStatus } from "./enums.ts";
import { events } from "./events.ts";

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    kind: mediaKind("kind").notNull(),
    status: mediaStatus("status").notNull().default("uploading"),
    originalKey: text("original_key").notNull(),
    originalMime: text("original_mime").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    thumbKey: text("thumb_key"),
    displayKey: text("display_key"),
    deviceId: text("device_id"),
    /** S3 multipart upload id while the original is uploading; cleared once it completes. */
    uploadId: text("upload_id"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_event_created_idx").on(table.eventId, table.createdAt.desc()),
    // A guest's own uploads ("Enviados — processando").
    index("media_event_device_idx").on(table.eventId, table.deviceId, table.createdAt.desc()),
  ],
);

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
