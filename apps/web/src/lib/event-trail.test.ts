import type { Event } from "@kokka/db";
import { describe, expect, it } from "vitest";
import { EMPTY_STATS } from "./event-stats";
import { buildTrail } from "./event-trail";

// 14/10 at 22:00 in São Paulo.
const now = new Date("2026-10-15T01:00:00Z");

function event(id: string, status: Event["status"], startsAt: string, extra: Partial<Event> = {}) {
  return {
    id,
    slug: id,
    name: id,
    subtitle: null,
    startsAt: new Date(startsAt),
    endsAt: null,
    status,
    closedAt: null,
    expiresAt: null,
    theme: {},
    createdAt: new Date("2026-09-01T12:00:00Z"),
    ...extra,
  } satisfies Event;
}

const events = [
  event("bodas", "closed", "2026-10-11T22:00:00Z", {
    closedAt: new Date("2026-10-12T22:00:00Z"),
    expiresAt: new Date("2026-10-17T22:00:00Z"),
  }),
  event("formatura", "expired", "2026-09-20T22:00:00Z"),
  event("julia", "draft", "2026-11-29T22:00:00Z"),
  event("ana", "active", "2026-10-14T22:00:00Z"),
];
const stats = new Map([
  ["ana", { ...EMPTY_STATS, images: 128, videos: 14 }],
  ["bodas", { ...EMPTY_STATS, images: 449 }],
]);

describe("buildTrail", () => {
  const trail = buildTrail(events, stats, now);

  it("goes from the furthest upcoming event to the oldest, alternating sides", () => {
    expect(trail.map((item) => [item.id, item.side])).toEqual([
      ["julia", "left"],
      ["ana", "right"],
      ["bodas", "left"],
      ["formatura", "right"],
    ]);
  });

  it("describes each status like the mockup, without a setup checklist count", () => {
    expect(trail.map(({ meta, action, deletion }) => ({ meta, action, deletion }))).toEqual([
      {
        meta: "29/11 · Rascunho · faltam 46 dias",
        action: { label: "Terminar de configurar", href: "/admin/eventos/julia" },
        deletion: undefined,
      },
      {
        meta: "14/10 · Ao vivo · 142 envios",
        action: { label: "Abrir telão", href: "/admin/eventos/ana/telao" },
        deletion: undefined,
      },
      { meta: "11/10 · Encerrado · 449 envios", action: undefined, deletion: "Apagado em 3 dias" },
      { meta: "20/09 · Concluído e apagado", action: undefined, deletion: undefined },
    ]);
  });

  it("handles singulars, today and events without a date", () => {
    const [draft, closed] = buildTrail(
      [
        event("hoje", "draft", "2026-10-14T23:30:00Z"),
        event("fechado", "closed", "2026-10-01T22:00:00Z", {
          expiresAt: new Date("2026-10-15T02:00:00Z"),
        }),
        event("sem-data", "draft", "2026-01-01T00:00:00Z", { startsAt: null }),
      ],
      new Map([["fechado", { ...EMPTY_STATS, videos: 1 }]]),
      now,
    );
    expect(draft?.meta).toBe("14/10 · Rascunho · é hoje");
    expect(closed?.meta).toBe("01/10 · Encerrado · 1 envio");
    expect(closed?.deletion).toBe("Apagado em 1 dia");
  });
});
