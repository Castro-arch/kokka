import { baseEnvSchema, parseEnv, storageEnvSchema } from "@kokka/shared";
import { z } from "zod";

export const workerEnvSchema = baseEnvSchema.extend({
  ...storageEnvSchema.shape,
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  /** Media jobs processed at once; videos take a CPU core each while transcoding. */
  MEDIA_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function getWorkerEnv(): WorkerEnv {
  return parseEnv(workerEnvSchema);
}
