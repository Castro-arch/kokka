/**
 * Creates the bucket and its CORS rule, the same setup the compose `s3-init` service applies to
 * SeaweedFS (and R2 gets in its dashboard). For local storage run without Docker. Idempotent.
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  NotFound,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { parseEnv, storageEnvSchema } from "./env.ts";
import { createStorage } from "./storage.ts";

const env = parseEnv(storageEnvSchema.extend({ APP_URL: z.url() }));
const { client, bucket } = createStorage(env);
// Browser uploads come from the app; CORS matches an origin, never a path or trailing slash.
const origin = new URL(env.APP_URL).origin;

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
} catch (error) {
  if (!(error instanceof NotFound)) throw error;
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
}

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [origin],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
client.destroy();
console.log(`Bucket ${bucket} ready, CORS origin ${origin}`);
