/**
 * Runs once when the server starts: validates the environment so a missing or invalid variable
 * stops `next dev` / `next start` right away instead of failing on the first request. Skipped
 * during `next build`, which must not need runtime secrets.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { getEnv } = await import("./lib/env");
  getEnv();
}
