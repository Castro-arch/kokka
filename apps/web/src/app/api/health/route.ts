import { sql } from "@kokka/db";
import { publicHealthReport, runHealthChecks } from "@kokka/shared";
import { getDb } from "@/lib/db";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await runHealthChecks({
    db: () => getDb().execute(sql`select 1`),
    redis: () => getRedis().ping(),
  });
  if (report.status !== "ok") console.error("Health check failed", report.checks);

  return Response.json(publicHealthReport(report), {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
