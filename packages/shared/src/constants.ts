export const EVENT_STATUSES = ["draft", "active", "closed", "expired"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const MEDIA_KINDS = ["image", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const MEDIA_STATUSES = ["uploading", "processing", "ready", "failed", "hidden"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const EXPORT_STATUSES = ["pending", "processing", "ready", "failed"] as const;
export type ExportStatus = (typeof EXPORT_STATUSES)[number];

/** Days between closing an event and deleting its media. */
export const EVENT_RETENTION_DAYS = 5;
/** Hours before expiration when the gallery starts warning guests. */
export const EXPIRY_WARNING_HOURS = 24;

export const MAX_VIDEO_DURATION_MS = 3 * 60 * 1000;
export const MAX_VIDEO_SIZE_BYTES = 1024 ** 3;
