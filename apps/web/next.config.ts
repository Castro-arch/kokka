import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace files from the monorepo root so the standalone build includes workspace packages.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
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
