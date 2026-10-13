import { describe, expect, it } from "vitest";
import { eventInputSchema, themeInputSchema } from "./schemas.ts";

const validEvent = {
  name: "  Casamento Ana & Leo ",
  subtitle: "",
  startsAt: "2026-11-21T19:00",
  endsAt: "2026-11-22T03:00",
};

describe("eventInputSchema", () => {
  it("trims the name, nulls an empty subtitle and converts dates to UTC", () => {
    const event = eventInputSchema.parse(validEvent);
    expect(event.name).toBe("Casamento Ana & Leo");
    expect(event.subtitle).toBeNull();
    expect(event.startsAt.toISOString()).toBe("2026-11-21T22:00:00.000Z");
  });

  it("requires a name", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, name: "   " });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["name"],
      message: "Informe o nome do evento",
    });
  });

  it("rejects an end before the start", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, endsAt: "2026-11-21T18:00" });
    expect(result.error?.issues[0]?.path).toEqual(["endsAt"]);
  });

  it("rejects a missing date", () => {
    const result = eventInputSchema.safeParse({ ...validEvent, startsAt: "" });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["startsAt"],
      message: "Informe a data de início",
    });
  });
});

describe("themeInputSchema", () => {
  it("accepts a hex color and a known font", () => {
    expect(themeInputSchema.parse({ primaryColor: "#C2703D", font: "playfair" })).toEqual({
      primaryColor: "#c2703d",
      font: "playfair",
    });
  });

  it("rejects unknown fonts and invalid colors", () => {
    expect(themeInputSchema.safeParse({ primaryColor: "red", font: "inter" }).success).toBe(false);
    expect(themeInputSchema.safeParse({ primaryColor: "#000000", font: "comic" }).success).toBe(
      false,
    );
  });
});
