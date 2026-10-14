import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { proxy } from "../proxy";
import { clientIp, DEVICE_COOKIE, isDeviceId } from "./device";
import { hitRateLimit } from "./rate-limit";

describe("guest device cookie", () => {
  it("is set on the first visit to a guest page, without asking for a login", () => {
    const response = proxy(new NextRequest("http://localhost:3000/e/abc234"));
    expect(response.status).toBe(200);
    const cookie = response.cookies.get(DEVICE_COOKIE);
    expect(isDeviceId(cookie?.value)).toBe(true);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("is kept when the guest already has one", () => {
    const id = randomUUID();
    const request = new NextRequest("http://localhost:3000/api/e/abc234/uploads", {
      headers: { cookie: `${DEVICE_COOKIE}=${id}` },
    });
    expect(proxy(request).cookies.get(DEVICE_COOKIE)).toBeUndefined();
  });

  it("does not open the admin to guests", () => {
    const response = proxy(new NextRequest("http://localhost:3000/api/admin/eventos/x/qr"));
    expect(response.status).toBe(401);
  });
});

describe("clientIp", () => {
  it("trusts only the address the proxy set, not one the client forged", () => {
    // The client sent "1.2.3.4"; the proxy appended the real address.
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
    expect(
      clientIp(new Headers({ "x-real-ip": "198.51.100.1", "x-forwarded-for": "1.2.3.4" })),
    ).toBe("198.51.100.1");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

// Runs against a real Redis (CI service or the local .env); skipped when REDIS_URL is unset.
const redisUrl = process.env.REDIS_URL;

describe.runIf(redisUrl)("hitRateLimit", () => {
  const redis = new Redis(redisUrl ?? "", { lazyConnect: true });
  afterAll(() => redis.quit());

  it("allows up to the limit in a window and refuses the next hit", async () => {
    const key = `test:ratelimit:${randomUUID()}`;
    const hits = [];
    for (let i = 0; i < 4; i++) hits.push(await hitRateLimit(redis, key, 3, 60));
    expect(hits).toEqual([true, true, true, false]);
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
    await redis.del(key);
  });
});
