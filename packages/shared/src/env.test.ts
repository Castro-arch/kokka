import { describe, expect, it } from "vitest";
import { baseEnvSchema, parseEnv } from "./env.ts";

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
