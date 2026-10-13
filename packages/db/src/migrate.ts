import { baseEnvSchema, parseEnv } from "@kokka/shared";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client.ts";

const { DATABASE_URL } = parseEnv(baseEnvSchema.pick({ DATABASE_URL: true }));
const db = createDb(DATABASE_URL, { max: 1 });

await migrate(db, { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) });
await db.$client.end();
console.log("Migrations applied");
