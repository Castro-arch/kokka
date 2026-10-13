import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseEnv, storageEnvSchema } from "./env.ts";
import { createStorage } from "./storage.ts";

const offline = createStorage({
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "kokka",
  S3_ACCESS_KEY_ID: "key",
  S3_SECRET_ACCESS_KEY: "secret",
  S3_FORCE_PATH_STYLE: true,
});

describe("signedGetUrl", () => {
  it("signs a path-style url that expires", async () => {
    const url = new URL(await offline.signedGetUrl("events/ev1/cover/c1.webp", 120));
    expect(url.origin + url.pathname).toBe("http://localhost:9000/kokka/events/ev1/cover/c1.webp");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("120");
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
  });

  it("does not sign a body checksum into the url", async () => {
    const url = new URL(await offline.signedGetUrl("k"));
    const params = [...url.searchParams.keys()].map((key) => key.toLowerCase());
    expect(params.filter((key) => key.includes("checksum"))).toEqual([]);
  });
});

// Runs in CI against SeaweedFS; skipped locally unless the env is set.
const enabled = Boolean(process.env.S3_ENDPOINT);

describe.runIf(enabled)("storage round trip", () => {
  it("puts, reads through a signed url and deletes an object", async () => {
    const storage = createStorage(parseEnv(storageEnvSchema));
    const key = `test/${randomUUID()}.txt`;

    await storage.putObject(key, new TextEncoder().encode("olá"), {
      contentType: "text/plain; charset=utf-8",
    });
    const response = await fetch(await storage.signedGetUrl(key));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe("olá");

    await storage.deleteObject(key);
    expect((await fetch(await storage.signedGetUrl(key))).status).toBe(404);
  });
});
