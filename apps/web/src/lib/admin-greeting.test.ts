import { describe, expect, it } from "vitest";
import { adminGreeting } from "./admin-greeting";

// 14/10 at 22:00 in São Paulo.
const now = new Date("2026-10-15T01:00:00Z");
const event = (
  name: string,
  status: "draft" | "active" | "closed" | "expired",
  startsAt: string,
) => ({
  name,
  status,
  startsAt: new Date(startsAt),
});

describe("adminGreeting", () => {
  it("names the live party and the next draft", () => {
    expect(
      adminGreeting(
        "José Castro",
        [
          event("15 anos da Júlia", "draft", "2026-11-29T22:00:00Z"),
          event("Ana & Pedro", "active", "2026-10-14T22:00:00Z"),
          event("Bodas de Prata", "closed", "2026-10-11T22:00:00Z"),
        ],
        now,
      ),
    ).toEqual({
      title: "Oi, José! Hoje tem festa.",
      text: "Ana & Pedro está ao vivo. Próximo: 15 anos da Júlia, em 46 dias.",
    });
  });

  it("picks the nearest upcoming draft and says tomorrow", () => {
    expect(
      adminGreeting(
        "José",
        [
          event("Longe", "draft", "2026-12-20T22:00:00Z"),
          event("Perto", "draft", "2026-10-15T22:00:00Z"),
          event("Passou", "draft", "2026-10-01T22:00:00Z"),
        ],
        now,
      ),
    ).toEqual({ title: "Oi, José!", text: "Próximo: Perto, amanhã." });
  });

  it("invites to create an event when nothing is planned", () => {
    expect(adminGreeting("", [event("Velho", "expired", "2026-09-20T22:00:00Z")], now)).toEqual({
      title: "Oi!",
      text: "Nenhum evento marcado. Que tal criar o próximo?",
    });
  });
});
