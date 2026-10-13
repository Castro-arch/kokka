import { describe, expect, it } from "vitest";
import { EVENT_STATUSES } from "./constants.ts";
import { expiresAtFor, nextAdminStatus, previousAdminStatus } from "./event-status.ts";

describe("nextAdminStatus", () => {
  it("only moves forward: draft -> active -> closed", () => {
    expect(nextAdminStatus("draft")).toBe("active");
    expect(nextAdminStatus("active")).toBe("closed");
  });

  it("has no admin move out of closed or expired", () => {
    expect(nextAdminStatus("closed")).toBeNull();
    expect(nextAdminStatus("expired")).toBeNull();
  });

  it("never reaches expired or goes back", () => {
    const order = EVENT_STATUSES as readonly string[];
    for (const status of EVENT_STATUSES) {
      const next = nextAdminStatus(status);
      if (next === null) continue;
      expect(next).not.toBe("expired");
      expect(order.indexOf(next)).toBe(order.indexOf(status) + 1);
    }
  });
});

describe("previousAdminStatus", () => {
  it("is the inverse of nextAdminStatus", () => {
    expect(previousAdminStatus("active")).toBe("draft");
    expect(previousAdminStatus("closed")).toBe("active");
  });
});

describe("expiresAtFor", () => {
  it("is five days after closing", () => {
    const closedAt = new Date("2026-11-22T03:00:00.000Z");
    expect(expiresAtFor(closedAt).toISOString()).toBe("2026-11-27T03:00:00.000Z");
  });
});
