/**
 * S3 storage (Cloudflare R2 in production, SeaweedFS locally), shared by web and worker.
 * Server-only: imported as `@kokka/shared/storage`, never from the package index, so the AWS SDK
 * stays out of client bundles. Apps validate their own env and pass it in.
 */
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListPartsCommand,
  NotFound,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageEnv } from "./env.ts";

/** Default lifetime of signed URLs, in seconds. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** A finished part of a multipart upload; the ETag comes from the part upload response. */
export interface UploadedPart {
  partNumber: number;
  etag: string;
  size?: number;
}

/**
 * One S3 request of a multipart upload run by the browser (the Uppy uploader calls S3 itself and
 * asks the app to presign each request). The app decides which of these it signs.
 */
export type MultipartRequest =
  | { op: "create"; key: string; contentType: string }
  | { op: "uploadPart"; key: string; uploadId: string; partNumber: number }
  | { op: "listParts" | "complete" | "abort"; key: string; uploadId: string };

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

    /** `downloadName` makes browsers save the object under that name instead of showing it. */
    signedGetUrl(
      key: string,
      expiresIn = SIGNED_URL_TTL_SECONDS,
      options: { downloadName?: string } = {},
    ): Promise<string> {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: options.downloadName
          ? `attachment; filename="${options.downloadName.replace(/[^\w.-]/g, "_")}"`
          : undefined,
      });
      return getSignedUrl(client, command, { expiresIn });
    },

    /** Size and type of a stored object, or undefined when it does not exist. */
    async headObject(key: string): Promise<{ size: number; contentType?: string } | undefined> {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { size: head.ContentLength ?? 0, contentType: head.ContentType };
      } catch (error) {
        if (error instanceof NotFound || error instanceof NoSuchKey) return undefined;
        throw error;
      }
    },

    async createMultipartUpload(key: string, contentType: string): Promise<string> {
      const { UploadId } = await client.send(
        new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      );
      if (!UploadId) throw new Error(`No upload id for ${key}`);
      return UploadId;
    },

    /** URL the browser PUTs one part to; the response carries the part ETag (exposed by CORS). */
    signUploadPart(
      key: string,
      uploadId: string,
      partNumber: number,
      expiresIn = SIGNED_URL_TTL_SECONDS,
    ): Promise<string> {
      const command = new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });
      return getSignedUrl(client, command, { expiresIn });
    },

    /**
     * Presigned URL for one request of a browser-run multipart upload. `create` signs the
     * Content-Type header, so the browser must send exactly `contentType`.
     */
    presignMultipartRequest(
      request: MultipartRequest,
      expiresIn = SIGNED_URL_TTL_SECONDS,
    ): Promise<string> {
      const target = { Bucket: bucket, Key: request.key };
      switch (request.op) {
        case "create":
          return getSignedUrl(
            client,
            new CreateMultipartUploadCommand({ ...target, ContentType: request.contentType }),
            { expiresIn, signableHeaders: new Set(["content-type"]) },
          );
        case "uploadPart":
          return getSignedUrl(
            client,
            new UploadPartCommand({
              ...target,
              UploadId: request.uploadId,
              PartNumber: request.partNumber,
            }),
            { expiresIn },
          );
        case "listParts":
          return getSignedUrl(
            client,
            new ListPartsCommand({ ...target, UploadId: request.uploadId }),
            { expiresIn },
          );
        case "complete":
          return getSignedUrl(
            client,
            new CompleteMultipartUploadCommand({ ...target, UploadId: request.uploadId }),
            { expiresIn },
          );
        case "abort":
          return getSignedUrl(
            client,
            new AbortMultipartUploadCommand({ ...target, UploadId: request.uploadId }),
            { expiresIn },
          );
      }
    },

    async listParts(key: string, uploadId: string): Promise<UploadedPart[]> {
      const parts: UploadedPart[] = [];
      let marker: string | undefined;
      do {
        const page = await client.send(
          new ListPartsCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumberMarker: marker,
          }),
        );
        for (const part of page.Parts ?? []) {
          if (part.PartNumber && part.ETag) {
            parts.push({ partNumber: part.PartNumber, etag: part.ETag, size: part.Size });
          }
        }
        marker = page.IsTruncated ? page.NextPartNumberMarker : undefined;
      } while (marker);
      return parts;
    },

    async completeMultipartUpload(
      key: string,
      uploadId: string,
      parts: UploadedPart[],
    ): Promise<void> {
      await client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: [...parts]
              .sort((a, b) => a.partNumber - b.partNumber)
              .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
          },
        }),
      );
    },

    async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
      await client.send(
        new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }),
      );
    },
  };
}

export type Storage = ReturnType<typeof createStorage>;
