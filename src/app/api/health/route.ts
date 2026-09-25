/**
 * Liveness/readiness alias for external monitors (docker healthcheck, k8s
 * probes, uptime bots) and CI wait-on gates. Mirrors /api/system/health:
 * a bare 200 with `{ status: "ok" }` when unauthenticated, dropping to 503
 * when the database ping fails. When `x-health-secret` matches HEALTH_SECRET,
 * full process/database detail is returned.
 */

import { NextResponse } from "next/server";
import { db, sql } from "@/db";
import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";
import crypto from "crypto";

export async function GET(request: Request) {
  const startTime = Date.now();
  const secretHeader = request.headers.get("x-health-secret");
  const expectedSecret = process.env.HEALTH_SECRET;
  let isAuthorized = false;
  if (expectedSecret && secretHeader) {
    const a = Buffer.from(secretHeader);
    const b = Buffer.from(expectedSecret);
    if (a.length === b.length) {
      isAuthorized = crypto.timingSafeEqual(a, b);
    }
  }

  const recordApm = (statusCode: number) => {
    if (process.env.APM_TELEMETRY_ENABLED === "false") return;
    const durationMs = Date.now() - startTime;
    try {
      SlidingWindowAggregator.getInstance().recordRequest("/api/health", "GET", statusCode, durationMs);
    } catch {}
  };

  try {
    await db.run(sql`SELECT 1`);
    const responseTimeMs = Date.now() - startTime;
    recordApm(200);
    if (isAuthorized) {
      return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
        database: { connected: true, responseTimeMs },
        environment: process.env.NODE_ENV || "development",
      });
    }
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    recordApm(503);
    console.error("[HealthCheck] Database ping failed:", error);
    return NextResponse.json(
      { status: "degraded", timestamp: new Date().toISOString(), error: "Database connectivity check failed" },
      { status: 503 }
    );
  }
}