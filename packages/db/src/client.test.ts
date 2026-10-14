import { describe, expect, it } from "vitest";
import { createDb, normalizeDatabaseUrl } from "./client.ts";

const neonUrl =
  "postgresql://kokka:p%40ss@ep-x-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

describe("normalizeDatabaseUrl", () => {
  it("drops channel_binding and keeps sslmode and the encoded password", () => {
    expect(normalizeDatabaseUrl(neonUrl)).toBe(
      "postgresql://kokka:p%40ss@ep-x-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require",
    );
  });

  it("removes the query string when nothing else is left", () => {
    expect(normalizeDatabaseUrl("postgres://k:k@localhost:5433/kokka?channel_binding=prefer")).toBe(
      "postgres://k:k@localhost:5433/kokka",
    );
  });

  it("leaves urls without parameters alone", () => {
    const url = "postgres://kokka:kokka@localhost:5433/kokka";
    expect(normalizeDatabaseUrl(url)).toBe(url);
  });
});

describe("createDb", () => {
  // postgres.js connects lazily, so reading the parsed options opens no connection.
  it("connects over tls without sending libpq-only parameters to the server", () => {
    const { options } = createDb(neonUrl).$client;
    expect(options.ssl).toBe("require");
    expect(options.pass).toBe("p@ss");
    expect(options.connection).not.toHaveProperty("channel_binding");
  });
});
