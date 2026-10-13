import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages}/*/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/.next/**"],
    environment: "node",
    passWithNoTests: true,
  },
});
