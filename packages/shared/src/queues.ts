export const QUEUE_NAMES = {
  /** Thumbnails, HEIC conversion and video transcoding (step 4). */
  media: "media",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Job on the media queue, enqueued once the original finished uploading. */
export interface MediaJobData {
  mediaId: string;
}

/**
 * Options of every media job. The media id is the job id, so enqueueing twice never duplicates;
 * transient failures retry with backoff, and finished jobs are kept for a while for inspection.
 */
export const MEDIA_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 30_000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
} as const;
