import type { AddressInfo } from "node:net";
import type { HealthReport } from "@kokka/shared";
import { afterEach, describe, expect, it } from "vitest";
import { createHealthServer } from "./health.ts";

let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  await close?.();
});

async function start(report: HealthReport) {
  const server = createHealthServer(() => Promise.resolve(report));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  close = () =>
    new Promise((resolve) =>
      server.close(() => {
        resolve();
      }),
    );
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe("createHealthServer", () => {
  it("returns 200 when healthy", async () => {
    const url = await start({ status: "ok", checks: { redis: { ok: true, latencyMs: 1 } } });
    const res = await fetch(`${url}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      checks: { redis: { ok: true, latencyMs: 1 } },
    });
  });

  it("returns 503 without error details when unhealthy", async () => {
    const url = await start({
      status: "error",
      checks: { redis: { ok: false, latencyMs: 2000, error: "connect ECONNREFUSED 10.0.0.5" } },
    });
    const res = await fetch(`${url}/health`);
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("ECONNREFUSED");
  });

  it("returns 404 for other paths", async () => {
    const url = await start({ status: "ok", checks: {} });
    expect((await fetch(`${url}/`)).status).toBe(404);
  });
});
