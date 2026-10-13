import { randomUUID } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { seedAdmin } from "./admin.ts";
import { createDb } from "./client.ts";
import { account, session, user } from "./schema/auth.ts";

// Runs against a migrated Postgres (CI provides one); skipped when DATABASE_URL is unset.
const databaseUrl = process.env.DATABASE_URL;

describe.runIf(databaseUrl)("seedAdmin", () => {
  const db = createDb(databaseUrl ?? "", { max: 1 });
  const email = `admin-${randomUUID()}@kokka.test`;

  afterAll(async () => {
    await db.delete(user).where(eq(user.email, email));
    await db.$client.end();
  });

  async function credentialFor(address: string) {
    const [row] = await db
      .select({ userId: user.id, name: user.name, password: account.password })
      .from(user)
      .innerJoin(account, eq(account.userId, user.id))
      .where(eq(user.email, address));
    return row;
  }

  it("creates the user with a verifiable password", async () => {
    const result = await seedAdmin(db, {
      email: email.toUpperCase(),
      password: "first-password-123",
      name: "José",
    });
    expect(result).toBe("created");

    const row = await credentialFor(email);
    expect(row?.name).toBe("José");
    expect(
      await verifyPassword({ hash: row?.password ?? "", password: "first-password-123" }),
    ).toBe(true);
  });

  it("resets the password and revokes sessions when run again", async () => {
    const before = await credentialFor(email);
    await db.insert(session).values({
      id: randomUUID(),
      token: randomUUID(),
      userId: before?.userId ?? "",
      expiresAt: new Date(Date.now() + 60_000),
      updatedAt: new Date(),
    });

    const result = await seedAdmin(db, { email, password: "second-password-456", name: "José C." });
    expect(result).toBe("updated");

    const after = await credentialFor(email);
    expect(after?.userId).toBe(before?.userId);
    expect(after?.name).toBe("José C.");
    expect(
      await verifyPassword({ hash: after?.password ?? "", password: "second-password-456" }),
    ).toBe(true);
    const sessions = await db
      .select()
      .from(session)
      .where(eq(session.userId, after?.userId ?? ""));
    expect(sessions).toHaveLength(0);
  });
});
