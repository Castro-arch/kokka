import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "server-only",
        replacement: fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
      },
      // A regex: a string key only matches when a "/" follows it, so "@/" never matched "@/lib/x".
      { find: /^@\//, replacement: fileURLToPath(new URL("./apps/web/src/", import.meta.url)) },
    ],
  },
  test: {
    include: ["{apps,packages}/*/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.next/**"],
    environment: "node",
    passWithNoTests: true,
  },
});
