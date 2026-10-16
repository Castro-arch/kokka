import { createDb, sql } from "@kokka/db";
import { eventChannel, QUEUE_NAMES, runHealthChecks, type MediaJobData } from "@kokka/shared";
import { createStorage } from "@kokka/shared/storage";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { getWorkerEnv } from "./env.ts";
import { createHealthServer } from "./health.ts";
import { handleMediaJob } from "./media/job.ts";
import type { ProcessDeps } from "./media/process-media.ts";
import { createMediaStore } from "./media/store.ts";

const env = getWorkerEnv();

// BullMQ workers block on Redis and require unlimited retries per request.
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
// Publishing runs on its own connection, never on the one BullMQ blocks on.
const publisher = new Redis(env.REDIS_URL);
const db = createDb(env.DATABASE_URL, { max: 5 });

const deps: ProcessDeps = {
  store: createMediaStore(db),
  storage: createStorage(env),
  publish: async (eventId, message) => {
    await publisher.publish(eventChannel(eventId), JSON.stringify(message));
  },
};

const mediaWorker = new Worker<MediaJobData>(
  QUEUE_NAMES.media,
  (job) => handleMediaJob(job, deps),
  {
    connection,
    concurrency: env.MEDIA_CONCURRENCY,
    // ffmpeg runs in a child process, so the lock keeps renewing; this only bounds a dead worker.
    lockDuration: 5 * 60_000,
  },
);

mediaWorker.on("completed", (job, result) => {
  console.log(`Media ${job.data.mediaId}: ${String(result)}`);
});

mediaWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id ?? "?"} on ${QUEUE_NAMES.media} failed:`, error.message);
});

const healthServer = createHealthServer(() =>
  runHealthChecks({
    db: () => db.execute(sql`select 1`),
    redis: () => connection.ping(),
    worker: () =>
      mediaWorker.isRunning() ? Promise.resolve() : Promise.reject(new Error("not running")),
  }),
);

healthServer.listen(env.WORKER_HEALTH_PORT, () => {
  console.log(`Worker started; health on :${env.WORKER_HEALTH_PORT}/health`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  // Let in-flight jobs finish before closing connections.
  await mediaWorker.close();
  healthServer.close();
  await Promise.allSettled([connection.quit(), publisher.quit(), db.$client.end()]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
