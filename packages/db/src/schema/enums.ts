import { EVENT_STATUSES, EXPORT_STATUSES, MEDIA_KINDS, MEDIA_STATUSES } from "@kokka/shared";
import { pgEnum } from "drizzle-orm/pg-core";

export const eventStatus = pgEnum("event_status", EVENT_STATUSES);
export const mediaKind = pgEnum("media_kind", MEDIA_KINDS);
export const mediaStatus = pgEnum("media_status", MEDIA_STATUSES);
export const exportStatus = pgEnum("export_status", EXPORT_STATUSES);
