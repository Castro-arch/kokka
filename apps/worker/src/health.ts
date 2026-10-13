import { createServer, type Server } from "node:http";
import { publicHealthReport, type HealthReport } from "@kokka/shared";

/**
 * Minimal HTTP server for container healthchecks: `GET /health` returns 200 or 503.
 * Error details are logged, never returned.
 */
export function createHealthServer(getReport: () => Promise<HealthReport>): Server {
  return createServer((req, res) => {
    if (req.method !== "GET" || req.url !== "/health") {
      res.writeHead(404).end();
      return;
    }

    void getReport().then((report) => {
      if (report.status !== "ok") console.error("Health check failed", report.checks);
      res
        .writeHead(report.status === "ok" ? 200 : 503, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        })
        .end(JSON.stringify(publicHealthReport(report)));
    });
  });
}
