import { NextResponse } from "next/server";
import { db, sql } from "@/db";
import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";

export async function GET(request: Request) {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const secretHeader = request.headers.get("x-health-secret");
  const expectedSecret = process.env.HEALTH_SECRET;
  
  const crypto = require('crypto');
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
    const durationMs = Number(((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime).toFixed(2));
    try {
      SlidingWindowAggregator.getInstance().recordRequest(
        "/api/system/health",
        "GET",
        statusCode,
        durationMs
      );
    } catch {}
  };

  try {
    // Perform fast database ping query
    await db.run(sql`SELECT 1`);
    const responseTimeMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime;

    if (!isAuthorized) {
      recordApm(200);
      return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    recordApm(200);
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: {
        connected: true,
        responseTimeMs,
      },
      environment: process.env.NODE_ENV || "development",
      version: "0.1.0",
    });
  } catch (error) {
    recordApm(503);
    console.error("[HealthCheck] Database ping failed:", error);

    // Fire-and-forget health alert webhook (Task P3-87)
    const webhookUrl = process.env.HEALTH_ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "degraded",
          timestamp: new Date().toISOString(),
          error: String(error),
          service: "thaibahive",
        }),
      }).catch(() => {}); // fire and forget
    }

    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        error: "Database connectivity check failed",
      },
      { status: 503 }
    );
  }
}
