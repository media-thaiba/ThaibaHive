import { NextResponse } from "next/server";
import { db, sql } from "@/db";
import { redis } from "@/lib/cache/redis-cluster";
import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";

async function checkDatabase(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    if (typeof (db as any).run === "function") {
      await (db as any).run(sql`SELECT 1`);
    } else if (typeof (db as any).execute === "function") {
      await (db as any).execute(sql`SELECT 1`);
    }
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { healthy: false, latencyMs: Date.now() - start, error: String(error) };
  }
}

async function checkRedis(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await redis.ping();
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return { healthy: false, latencyMs: Date.now() - start, error: String(error) };
  }
}

async function checkFCM(): Promise<{ healthy: boolean; error?: string }> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return { healthy: false, error: "FCM_SERVER_KEY not configured" };
  try {
    const res = await fetch("https://fcm.googleapis.com/v1/projects/-/messages:send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: { token: "test-token", data: { healthcheck: "true" } },
        validate_only: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    // 400 with "InvalidRegistration" means FCM is reachable (token just invalid)
    if (res.status === 400) {
      const data = await res.json();
      if (data.error?.details?.[0]?.errorCode === "INVALID_ARGUMENT") {
        return { healthy: true };
      }
    }
    return res.ok ? { healthy: true } : { healthy: false, error: `FCM responded ${res.status}` };
  } catch (error) {
    return { healthy: false, error: String(error) };
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();
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
    const durationMs = Number((Date.now() - startTime).toFixed(2));
    try {
      SlidingWindowAggregator.getInstance().recordRequest("/api/system/health/ready", "GET", statusCode, durationMs);
    } catch {}
  };

  // Run all dependency checks in parallel
  const [dbHealth, redisHealth, fcmHealth] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkFCM(),
  ]);

  const allHealthy = dbHealth.healthy && redisHealth.healthy && fcmHealth.healthy;
  const status = allHealthy ? "ok" : "degraded";
  const statusCode = allHealthy ? 200 : 503;

  const response = {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    version: process.env.APP_VERSION || "v3.36.0",
    environment: process.env.NODE_ENV || "development",
    checks: {
      database: dbHealth,
      redis: redisHealth,
      fcm: fcmHealth,
    },
  };

  if (!isAuthorized) {
    recordApm(200);
    return NextResponse.json({ status, timestamp: response.timestamp });
  }

  recordApm(statusCode);
  return NextResponse.json(response, { status: statusCode });
}