import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "**/node_modules/",
    "**/.next/",
    "**/.next-shots/",
    "**/dist/",
    "**/coverage/",
    "**/next-env.d.ts",
    "packages/db/migrations/",
  ]),
  js.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx,js,mjs}"],
    extends: [nextVitals],
    settings: { next: { rootDir: "apps/web" } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  prettier,
);
