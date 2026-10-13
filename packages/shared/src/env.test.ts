import { describe, expect, it } from "vitest";
import { baseEnvSchema, parseEnv, storageEnvSchema } from "./env.ts";

const valid = {
  DATABASE_URL: "postgres://kokka:kokka@localhost:5432/kokka",
  REDIS_URL: "redis://localhost:6379",
};

describe("parseEnv", () => {
  it("parses a valid environment and applies defaults", () => {
    expect(parseEnv(baseEnvSchema, valid)).toEqual({ ...valid, NODE_ENV: "development" });
  });

  it("lists every invalid variable", () => {
    expect(() => parseEnv(baseEnvSchema, { DATABASE_URL: "mysql://localhost" })).toThrow(
      /DATABASE_URL[\s\S]*REDIS_URL/,
    );
  });

  it("accepts tls redis urls", () => {
    const env = parseEnv(baseEnvSchema, { ...valid, REDIS_URL: "rediss://redis.example:6380" });
    expect(env.REDIS_URL).toBe("rediss://redis.example:6380");
  });
});

describe("storageEnvSchema", () => {
  const storage = {
    S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
    S3_BUCKET: "kokka",
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
  };

  it("defaults to the R2 region and path-style urls", () => {
    expect(parseEnv(storageEnvSchema, storage)).toMatchObject({
      S3_REGION: "auto",
      S3_FORCE_PATH_STYLE: true,
    });
  });

  it("parses the path-style flag as a boolean", () => {
    const env = parseEnv(storageEnvSchema, { ...storage, S3_FORCE_PATH_STYLE: "false" });
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
  });
});
