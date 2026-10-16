// Puts media stuck in "processing" back on the queue: uploads finished before the worker could
// process them (before step 4), or whose jobs were lost. Safe to run more than once.
//
//   pnpm --filter @kokka/worker requeue
import { createDb, eq, media } from "@kokka/db";
import {
  baseEnvSchema,
  MEDIA_JOB_OPTIONS,
  parseEnv,
  QUEUE_NAMES,
  type MediaJobData,
} from "@kokka/shared";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const env = parseEnv(baseEnvSchema);
const db = createDb(env.DATABASE_URL, { max: 1 });
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue<MediaJobData>(QUEUE_NAMES.media, { connection });

try {
  const stuck = await db.select({ id: media.id }).from(media).where(eq(media.status, "processing"));
  let queued = 0;
  for (const { id } of stuck) {
    const existing = await queue.getJob(id);
    const state = existing ? await existing.getState() : undefined;
    // Waiting, delayed or running jobs are already on their way.
    if (
      state === "waiting" ||
      state === "delayed" ||
      state === "active" ||
      state === "prioritized"
    ) {
      continue;
    }
    // A finished job keeps its id for a while, and adding the same id again would be ignored.
    if (existing) await existing.remove();
    await queue.add("process", { mediaId: id }, { ...MEDIA_JOB_OPTIONS, jobId: id });
    queued += 1;
  }
  console.log(`${String(stuck.length)} processing, ${String(queued)} queued again`);
} finally {
  await queue.close();
  await connection.quit();
  await db.$client.end();
}
