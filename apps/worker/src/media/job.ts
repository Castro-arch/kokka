import { UnrecoverableError } from "bullmq";
import { InvalidMediaError } from "./errors.ts";
import { failMedia, processMedia, type ProcessDeps } from "./process-media.ts";
import { MissingToolError } from "./run.ts";

/** The parts of a BullMQ job the processor reads. */
export interface MediaJob {
  id?: string;
  data: { mediaId: string };
  attemptsMade: number;
  opts: { attempts?: number };
}

/**
 * Runs a media job with the retry policy: a bad upload (or a tool missing from the image) fails
 * the media at once, without retries; other errors are retried with backoff and fail the media
 * only on the last attempt.
 */
export async function handleMediaJob(job: MediaJob, deps: ProcessDeps): Promise<string> {
  try {
    return await processMedia(job.data.mediaId, deps);
  } catch (error) {
    if (error instanceof InvalidMediaError || error instanceof MissingToolError) {
      await failMedia(job.data.mediaId, deps);
      throw new UnrecoverableError(error.message);
    }
    // attemptsMade counts the attempts before this one.
    if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) await failMedia(job.data.mediaId, deps);
    throw error;
  }
}
