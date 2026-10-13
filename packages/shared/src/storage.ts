/**
 * S3 storage (Cloudflare R2 in production, SeaweedFS locally), shared by web and worker.
 * Server-only: imported as `@kokka/shared/storage`, never from the package index, so the AWS SDK
 * stays out of client bundles. Apps validate their own env and pass it in.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageEnv } from "./env.ts";

/** Default lifetime of signed URLs, in seconds. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function createStorage(env: StorageEnv) {
  const bucket = env.S3_BUCKET;
  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    // By default the SDK signs a CRC32 of the body into presigned URLs, computed before the body
    // exists, so every browser upload fails with BadDigest. Only send checksums when required.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return {
    client,
    bucket,

    async putObject(
      key: string,
      body: Uint8Array,
      options: { contentType: string; cacheControl?: string },
    ): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: options.contentType,
          CacheControl: options.cacheControl,
        }),
      );
    },

    /** Succeeds when the key does not exist, as S3 does. */
    async deleteObject(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    signedGetUrl(key: string, expiresIn = SIGNED_URL_TTL_SECONDS): Promise<string> {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn,
      });
    },
  };
}

export type Storage = ReturnType<typeof createStorage>;
