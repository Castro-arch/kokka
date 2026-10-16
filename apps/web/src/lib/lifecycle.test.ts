import { describe, expect, it } from "vitest";
import { buildLifecycle } from "./lifecycle";

// Ana & Pedro: created 02/10, live since 14/10 19h (São Paulo), ending 15/10 at 3h.
const base = {
  createdAt: new Date("2026-10-02T15:00:00Z"),
  startsAt: new Date("2026-10-14T22:00:00Z"),
  endsAt: new Date("2026-10-15T06:00:00Z"),
  closedAt: null,
  expiresAt: null,
};

describe("buildLifecycle", () => {
  it("shows the live step with planned close and deletion dates", () => {
    const lifecycle = buildLifecycle({ ...base, status: "active" });
    expect(lifecycle.steps.map(({ label, state, date }) => [label, state, date])).toEqual([
      ["Rascunho", "done", "02/10"],
      ["Ativo", "current", "agora"],
      ["Encerrado", "todo", "15/10, 3h"],
      ["Apagado", "todo", "20/10"],
    ]);
    expect(lifecycle.progress).toBeCloseTo(1 / 3);
    expect(lifecycle.note).toBe("Os envios fecham às 3h. Depois, tudo fica 5 dias para baixar.");
  });

  it("uses the real close and deletion dates once closed", () => {
    const lifecycle = buildLifecycle({
      ...base,
      status: "closed",
      closedAt: new Date("2026-10-15T02:30:00Z"),
      expiresAt: new Date("2026-10-20T02:30:00Z"),
    });
    expect(lifecycle.steps.map(({ state, date }) => [state, date])).toEqual([
      ["done", "02/10"],
      ["done", "14/10"],
      ["current", "14/10, 23h30"],
      ["todo", "19/10"],
    ]);
    expect(lifecycle.note).toBe("Envios fechados. Tudo fica disponível para baixar até 19/10.");
  });

  it("starts empty for drafts and ends complete for expired events", () => {
    const draft = buildLifecycle({ ...base, status: "draft" });
    expect(draft.progress).toBe(0);
    expect(draft.steps[0]?.state).toBe("current");
    expect(draft.steps[1]?.date).toBe("14/10");

    const expired = buildLifecycle({
      ...base,
      status: "expired",
      closedAt: new Date("2026-10-15T06:00:00Z"),
      expiresAt: new Date("2026-10-20T06:00:00Z"),
    });
    expect(expired.progress).toBe(1);
    expect(expired.steps.every((step) => step.state === "done")).toBe(true);
    expect(expired.note).toBe("As fotos e os vídeos foram apagados em 20/10.");
  });

  it("has no dates to show without a schedule", () => {
    const lifecycle = buildLifecycle({ ...base, status: "draft", startsAt: null, endsAt: null });
    expect(lifecycle.steps.map((step) => step.date)).toEqual(["02/10", "—", "—", "—"]);
  });
});
