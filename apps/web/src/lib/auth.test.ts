import { randomUUID } from "node:crypto";
import { eq, seedAdmin, user } from "@kokka/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAuth } from "./auth";
import { getDb } from "./db";

// Runs in CI against a migrated Postgres; skipped locally unless the env is set.
const enabled = Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);

describe.runIf(enabled)("auth", () => {
  const email = `admin-${randomUUID()}@kokka.test`;
  const password = "correct-password-123";

  beforeAll(async () => {
    await seedAdmin(getDb(), { email, password, name: "Admin" });
  });

  afterAll(async () => {
    await getDb().delete(user).where(eq(user.email, email));
    await getDb().$client.end();
  });

  it("signs in the seeded admin", async () => {
    const result = await getAuth().api.signInEmail({ body: { email, password } });
    expect(result.user.email).toBe(email);
    expect(result.token).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    await expect(
      getAuth().api.signInEmail({ body: { email, password: "wrong-password-123" } }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("does not allow public sign-up", async () => {
    await expect(
      getAuth().api.signUpEmail({
        body: { email: `intruder-${randomUUID()}@kokka.test`, password, name: "Intruder" },
      }),
    ).rejects.toBeTruthy();
    const intruders = await getDb().select().from(user).where(eq(user.name, "Intruder"));
    expect(intruders).toHaveLength(0);
  });
});
