export type HealthCheck = () => Promise<unknown>;

export interface CheckResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  status: "ok" | "error";
  checks: Record<string, CheckResult>;
}

const DEFAULT_TIMEOUT_MS = 2000;

// Drivers often wrap the real reason (e.g. ECONNREFUSED) in `cause`.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message;
}

/** Report without error details, safe to return from a public endpoint. */
export function publicHealthReport(report: HealthReport): HealthReport {
  const checks = Object.fromEntries(
    Object.entries(report.checks).map(([name, { ok, latencyMs }]) => [name, { ok, latencyMs }]),
  );
  return { status: report.status, checks };
}

async function runCheck(check: HealthCheck, timeoutMs: number): Promise<CheckResult> {
  const startedAt = performance.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
    return { ok: true, latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - startedAt),
      error: describeError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Runs all dependency checks in parallel; any failure or timeout marks the report as `error`. */
export async function runHealthChecks(
  checks: Record<string, HealthCheck>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<HealthReport> {
  const entries = await Promise.all(
    Object.entries(checks).map(
      async ([name, check]) => [name, await runCheck(check, timeoutMs)] as const,
    ),
  );
  const results = Object.fromEntries(entries);
  const status = entries.every(([, result]) => result.ok) ? "ok" : "error";
  return { status, checks: results };
}
