import { describe, expect, it } from "vitest";
import { publicHealthReport, runHealthChecks } from "./health.ts";

describe("runHealthChecks", () => {
  it("reports ok when every check passes", async () => {
    const report = await runHealthChecks({
      db: () => Promise.resolve(),
      redis: () => Promise.resolve(),
    });
    expect(report.status).toBe("ok");
    expect(report.checks.db?.ok).toBe(true);
    expect(report.checks.redis?.ok).toBe(true);
  });

  it("reports error with the failure message when a check throws", async () => {
    const report = await runHealthChecks({
      db: () => Promise.resolve(),
      redis: () => Promise.reject(new Error("connection refused")),
    });
    expect(report.status).toBe("error");
    expect(report.checks.redis).toMatchObject({ ok: false, error: "connection refused" });
  });

  it("fails a check that exceeds the timeout", async () => {
    const report = await runHealthChecks(
      { slow: () => new Promise((resolve) => setTimeout(resolve, 200)) },
      20,
    );
    expect(report.status).toBe("error");
    expect(report.checks.slow?.error).toMatch(/timed out/);
  });

  it("includes the underlying cause in the error message", async () => {
    const report = await runHealthChecks({
      db: () => Promise.reject(new Error("Failed query", { cause: new Error("ECONNREFUSED") })),
    });
    expect(report.checks.db?.error).toBe("Failed query: ECONNREFUSED");
  });
});

describe("publicHealthReport", () => {
  it("strips error details", () => {
    const report = publicHealthReport({
      status: "error",
      checks: { db: { ok: false, latencyMs: 3, error: "connect ECONNREFUSED 10.0.0.5:5432" } },
    });
    expect(report).toEqual({ status: "error", checks: { db: { ok: false, latencyMs: 3 } } });
  });
});
