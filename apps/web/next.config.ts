import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

// The single .env lives at the repo root, shared with the worker and the db scripts; next only
// reads apps/web, so load the root files too. Force a reload because next has already cached its
// own (empty) load. Variables set by the host (Coolify, CI) still win over the files.
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", console, true);

// `next dev` only serves its scripts and HMR to localhost; `pnpm dev:web:lan` with APP_URL set to
// the machine's LAN address lets a phone on the same Wi-Fi load the app. Ignored outside dev.
const appUrl = process.env.APP_URL;
const lanHost = appUrl && URL.canParse(appUrl) ? new URL(appUrl).hostname : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHost ? [lanHost] : [],
  output: "standalone",
  // Trace files from the monorepo root so the standalone build includes workspace packages.
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@kokka/db", "@kokka/shared"],
  poweredByHeader: false,
  // The print card reads its TTFs at runtime; ship them with the route in the standalone build.
  outputFileTracingIncludes: {
    "/api/admin/eventos/[id]/arte": ["./assets/fonts/**/*.ttf"],
  },
  experimental: {
    // proxy.ts buffers request bodies and silently truncates past this size (default 10 MB).
    // Covers go up to 15 MB; guest media is uploaded straight to storage, never through here.
    proxyClientMaxBodySize: "16mb",
  },
};

export default nextConfig;
