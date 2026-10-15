"use server";

import { isAPIError } from "better-auth/api";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  nameSchema,
  PASSWORD_CHANGED_URL,
  PASSWORD_RATE_LIMIT,
  passwordChangeSchema,
} from "@/lib/account";
import { getAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guard";
import { fieldErrors, formValues, type FormState } from "@/lib/form";
import { hitRateLimit } from "@/lib/rate-limit";
import { getRedis } from "@/lib/redis";

/** Saves the admin's display name through Better Auth. */
export async function updateNameAction(
  _state: FormState | null,
  form: FormData,
): Promise<FormState> {
  await requireAdmin();
  const values = formValues(form, ["name"]);
  const parsed = nameSchema.safeParse(values);
  if (!parsed.success) return { values, errors: fieldErrors(parsed.error) } satisfies FormState;

  await getAuth().api.updateUser({ body: { name: parsed.data.name }, headers: await headers() });
  refresh();
  return {
    values: { name: parsed.data.name },
    errors: {},
    message: "Nome salvo.",
  } satisfies FormState;
}

/**
 * Changes the admin password and signs out every other session. Attempts are rate limited per
 * admin, and passwords never travel back to the form.
 */
export async function changePasswordAction(
  _state: FormState | null,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin();
  const { attempts, windowSeconds } = PASSWORD_RATE_LIMIT;
  const allowed = await hitRateLimit(
    getRedis(),
    `ratelimit:password:${user.id}`,
    attempts,
    windowSeconds,
  );
  if (!allowed) {
    return {
      values: {},
      errors: { form: "Muitas tentativas. Espere 15 minutos e tente de novo." },
    } satisfies FormState;
  }

  const parsed = passwordChangeSchema.safeParse(
    formValues(form, ["currentPassword", "newPassword", "confirmPassword"]),
  );
  if (!parsed.success) return { values: {}, errors: fieldErrors(parsed.error) } satisfies FormState;

  try {
    await getAuth().api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "INVALID_PASSWORD") {
      return {
        values: {},
        errors: { currentPassword: "Senha atual incorreta." },
      } satisfies FormState;
    }
    throw error;
  }
  // Better Auth replaced every session, this one included, and set the new cookie on this
  // response; re-rendering here would still read the old cookie and bounce to the login. A
  // redirect makes the next request carry the new session.
  redirect(PASSWORD_CHANGED_URL);
}
