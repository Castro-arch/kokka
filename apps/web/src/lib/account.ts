import { z } from "zod";

/** Same minimum Better Auth enforces (lib/auth.ts). */
export const MIN_PASSWORD_LENGTH = 12;
/** Better Auth's default maximum; longer passwords are rejected before hashing. */
export const MAX_PASSWORD_LENGTH = 128;

export const nameSchema = z.object({
  name: z.string().trim().min(1, "Digite seu nome.").max(60, "Use no máximo 60 caracteres."),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Digite sua senha atual."),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use pelo menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`)
      .max(MAX_PASSWORD_LENGTH, `Use no máximo ${String(MAX_PASSWORD_LENGTH)} caracteres.`),
    confirmPassword: z.string(),
  })
  .refine((value) => value.confirmPassword === value.newPassword, {
    path: ["confirmPassword"],
    message: "As duas senhas não são iguais.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "A nova senha precisa ser diferente da atual.",
  });

/** Password attempts per admin in a window: enough for typos, not for guessing. */
export const PASSWORD_RATE_LIMIT = { attempts: 5, windowSeconds: 15 * 60 };

/** Where a successful password change lands; the page shows the confirmation from the query. */
export const PASSWORD_CHANGED_URL = "/admin/configuracoes?senha=trocada";
