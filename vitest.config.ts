import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
      "@/": fileURLToPath(new URL("./apps/web/src/", import.meta.url)),
    },
  },
  test: {
    include: ["{apps,packages}/*/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.next/**"],
    environment: "node",
    passWithNoTests: true,
  },
});
