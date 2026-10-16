import { parseEnv } from "@kokka/shared";
import { describe, expect, it } from "vitest";
import { workerEnvSchema } from "./env.ts";

const valid = {
  DATABASE_URL: "postgres://kokka:kokka@localhost:5432/kokka",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  S3_BUCKET: "kokka",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
};

describe("workerEnvSchema", () => {
  it("needs the storage settings, since the worker reads and writes media", () => {
    const { S3_BUCKET: _bucket, ...withoutBucket } = valid;
    expect(() => parseEnv(workerEnvSchema, withoutBucket)).toThrow(/S3_BUCKET/);
  });

  it("defaults the health port and the media concurrency", () => {
    expect(parseEnv(workerEnvSchema, valid)).toMatchObject({
      WORKER_HEALTH_PORT: 3001,
      MEDIA_CONCURRENCY: 2,
    });
  });

  it("reads the media concurrency", () => {
    expect(parseEnv(workerEnvSchema, { ...valid, MEDIA_CONCURRENCY: "4" }).MEDIA_CONCURRENCY).toBe(
      4,
    );
    expect(() => parseEnv(workerEnvSchema, { ...valid, MEDIA_CONCURRENCY: "0" })).toThrow(
      /MEDIA_CONCURRENCY/,
    );
  });
});
