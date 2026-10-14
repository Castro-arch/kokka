export const QUEUE_NAMES = {
  /** Thumbnails, HEIC conversion and video transcoding (step 4). */
  media: "media",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Job on the media queue, enqueued once the original finished uploading. */
export interface MediaJobData {
  mediaId: string;
}
