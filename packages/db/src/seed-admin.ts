import { baseEnvSchema, parseEnv } from "@kokka/shared";
import { z } from "zod";
import { seedAdmin } from "./admin.ts";
import { createDb } from "./client.ts";

const env = parseEnv(
  baseEnvSchema.pick({ DATABASE_URL: true }).extend({
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().min(12, "use at least 12 characters"),
    ADMIN_NAME: z.string().trim().min(1).default("Admin"),
  }),
);

const db = createDb(env.DATABASE_URL, { max: 1 });
const result = await seedAdmin(db, {
  email: env.ADMIN_EMAIL,
  password: env.ADMIN_PASSWORD,
  name: env.ADMIN_NAME,
});
await db.$client.end();
console.log(result === "created" ? "Admin user created" : "Admin password and name updated");
