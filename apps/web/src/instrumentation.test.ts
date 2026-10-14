import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validEnv = {
  DATABASE_URL: "postgres://kokka:kokka@localhost:5433/kokka",
  REDIS_URL: "redis://localhost:6380",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-only-secret-0123456789abcdefghij",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "kokka",
  S3_ACCESS_KEY_ID: "kokka",
  S3_SECRET_ACCESS_KEY: "kokka-dev-secret",
};

function stubEnv(env: Record<string, string | undefined>) {
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("NEXT_PHASE", "phase-development-server");
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
}

describe("register", () => {
  // getEnv caches the parsed env per module instance.
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it("fails the server start when required variables are missing", async () => {
    stubEnv({ ...validEnv, DATABASE_URL: undefined, BETTER_AUTH_SECRET: undefined });
    const { register } = await import("./instrumentation");
    await expect(register()).rejects.toThrow(/DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/);
  });

  it("starts when every required variable is set", async () => {
    stubEnv(validEnv);
    const { register } = await import("./instrumentation");
    await expect(register()).resolves.toBeUndefined();
  });

  it("does not check the environment during next build", async () => {
    stubEnv({ ...validEnv, DATABASE_URL: undefined });
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const { register } = await import("./instrumentation");
    await expect(register()).resolves.toBeUndefined();
  });
});
