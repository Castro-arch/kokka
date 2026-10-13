import { z } from "zod";
import { parseLocalDateTime } from "./datetime.ts";
import { FONT_KEYS } from "./theme.ts";

const localDateTime = (label: string) =>
  z.string().transform((value, ctx) => {
    const date = parseLocalDateTime(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: `Informe ${label}` });
      return z.NEVER;
    }
    return date;
  });

/** Event data as submitted by the admin form (`datetime-local` strings in the event timezone). */
export const eventInputSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do evento").max(120, "Use até 120 caracteres"),
    subtitle: z
      .string()
      .trim()
      .max(160, "Use até 160 caracteres")
      .transform((value) => value || null),
    startsAt: localDateTime("a data de início"),
    endsAt: localDateTime("a data de término"),
  })
  .refine((event) => event.endsAt > event.startsAt, {
    path: ["endsAt"],
    message: "O término precisa ser depois do início",
  });

export type EventInput = z.infer<typeof eventInputSchema>;

export const themeInputSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Escolha uma cor válida")
    .transform((value) => value.toLowerCase()),
  font: z.enum(FONT_KEYS, { error: "Escolha uma das fontes disponíveis" }),
});

export type ThemeInput = z.infer<typeof themeInputSchema>;
