import { baseEnvSchema, parseEnv } from "@kokka/shared";
import { z } from "zod";

export const workerEnvSchema = baseEnvSchema.extend({
  WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function getWorkerEnv(): WorkerEnv {
  return parseEnv(workerEnvSchema);
}
