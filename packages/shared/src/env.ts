import { z } from "zod";

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

/** S3 settings; each app that touches storage extends its own env schema with these. */
export const storageEnvSchema = z.object({
  S3_ENDPOINT: z.url({ protocol: /^https?$/ }),
  S3_REGION: z.string().min(1).default("auto"),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(true),
});

export type StorageEnv = z.infer<typeof storageEnvSchema>;

/**
 * Validates environment variables against a schema and fails fast with a readable message,
 * so a misconfigured container never starts half-working.
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
