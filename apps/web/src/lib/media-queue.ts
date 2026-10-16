import "server-only";
import {
  eventChannel,
  MEDIA_JOB_OPTIONS,
  QUEUE_NAMES,
  type MediaJobData,
  type RealtimeMessage,
} from "@kokka/shared";
import { Queue } from "bullmq";
import { getRedis } from "./redis";

// Reuse the queue across hot reloads in development.
const globalForQueue = globalThis as unknown as { kokkaMediaQueue?: Queue<MediaJobData> };

export function getMediaQueue(): Queue<MediaJobData> {
  globalForQueue.kokkaMediaQueue ??= new Queue<MediaJobData>(QUEUE_NAMES.media, {
    connection: getRedis(),
  });
  return globalForQueue.kokkaMediaQueue;
}

/** Hands an uploaded original to the worker. The media id is the job id, so retries never duplicate. */
export async function enqueueMediaProcessing(mediaId: string): Promise<void> {
  await getMediaQueue().add("process", { mediaId }, { ...MEDIA_JOB_OPTIONS, jobId: mediaId });
}

export async function publishToEvent(eventId: string, message: RealtimeMessage): Promise<void> {
  await getRedis().publish(eventChannel(eventId), JSON.stringify(message));
}
