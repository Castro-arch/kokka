import "server-only";
import { baseEnvSchema, parseEnv } from "@kokka/shared";
import { z } from "zod";

export const webEnvSchema = baseEnvSchema.extend({
  /** Public base URL (used for auth callbacks and the guest link in QR codes). */
  APP_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  BETTER_AUTH_SECRET: z.string().min(32, "use at least 32 characters"),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

let env: WebEnv | undefined;

/** Parsed lazily so `next build` does not require runtime secrets. */
export function getEnv(): WebEnv {
  env ??= parseEnv(webEnvSchema);
  return env;
}
