import "server-only";
import { baseEnvSchema, parseEnv, type BaseEnv } from "@kokka/shared";

let env: BaseEnv | undefined;

/** Parsed lazily so `next build` does not require runtime secrets. */
export function getEnv(): BaseEnv {
  env ??= parseEnv(baseEnvSchema);
  return env;
}
