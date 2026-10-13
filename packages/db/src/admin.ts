import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import type { Database } from "./client.ts";
import { account, session, user } from "./schema/auth.ts";

export interface AdminCredentials {
  email: string;
  password: string;
  name: string;
}

/**
 * Creates the single admin user, or resets its password if it already exists. There is no public
 * sign-up or password recovery, so this is also the way to change the admin password.
 * Writes the same rows Better Auth's email/password sign-up would.
 */
export async function seedAdmin(
  db: Database,
  { email, password, name }: AdminCredentials,
): Promise<"created" | "updated"> {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(user).where(eq(user.email, normalizedEmail));

    if (!existing) {
      const userId = randomUUID();
      await tx.insert(user).values({
        id: userId,
        name,
        email: normalizedEmail,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
      return "created";
    }

    await tx.update(user).set({ name, updatedAt: now }).where(eq(user.id, existing.id));
    const updated = await tx
      .update(account)
      .set({ password: passwordHash, updatedAt: now })
      .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")))
      .returning({ id: account.id });
    if (updated.length === 0) {
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: existing.id,
        providerId: "credential",
        userId: existing.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }
    // A password reset must log out every existing session.
    await tx.delete(session).where(eq(session.userId, existing.id));
    return "updated";
  });
}
