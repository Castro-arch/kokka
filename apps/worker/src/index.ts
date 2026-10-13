import { createDb, sql } from "@kokka/db";
import { runHealthChecks } from "@kokka/shared";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { getWorkerEnv } from "./env.ts";
import { createHealthServer } from "./health.ts";
import { QUEUE_NAMES } from "./queues.ts";

const env = getWorkerEnv();

// BullMQ workers block on Redis and require unlimited retries per request.
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const db = createDb(env.DATABASE_URL, { max: 5 });

const mediaWorker = new Worker(
  QUEUE_NAMES.media,
  (job) => {
    throw new Error(`No processor for media job ${job.name} yet`);
  },
  { connection },
);

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
  await Promise.allSettled([connection.quit(), db.$client.end()]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
