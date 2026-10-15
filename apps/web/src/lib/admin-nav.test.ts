import { describe, expect, it } from "vitest";
import { eventIdFromPath, pickContextEvent, sectionFromPath } from "./admin-nav";

describe("sectionFromPath", () => {
  it.each([
    ["/admin", "eventos"],
    ["/admin/eventos/novo", "eventos"],
    ["/admin/eventos/abc", "eventos"],
    ["/admin/eventos/abc/telao", "telao"],
    ["/admin/eventos/abc/midias", "midias"],
    ["/admin/configuracoes", "configuracoes"],
  ])("%s → %s", (pathname, section) => {
    expect(sectionFromPath(pathname)).toBe(section);
  });
});

describe("eventIdFromPath", () => {
  it("reads the event id from event pages", () => {
    expect(eventIdFromPath("/admin/eventos/abc")).toBe("abc");
    expect(eventIdFromPath("/admin/eventos/abc/midias")).toBe("abc");
  });

  it("ignores the create form and other pages", () => {
    expect(eventIdFromPath("/admin/eventos/novo")).toBeUndefined();
    expect(eventIdFromPath("/admin")).toBeUndefined();
    expect(eventIdFromPath("/admin/configuracoes")).toBeUndefined();
  });
});

describe("pickContextEvent", () => {
  const event = (id: string, status: "draft" | "active" | "closed" | "expired", day: number) => ({
    id,
    status,
    createdAt: new Date(2026, 9, day),
  });

  it("prefers the live event even if it is older", () => {
    expect(pickContextEvent([event("new", "draft", 10), event("live", "active", 1)])).toBe("live");
  });

  it("falls back to the most recently created event", () => {
    expect(pickContextEvent([event("old", "closed", 1), event("new", "draft", 10)])).toBe("new");
  });

  it("returns undefined without events", () => {
    expect(pickContextEvent([])).toBeUndefined();
  });
});
