import { NextResponse } from "next/server";
import { db, sql, isPostgres } from "@/db";
import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";
import { sanitizeErrorMessage } from "@/lib/diagnostics/sanitize";
import crypto from "crypto";

/**
 * Race a promise against an explicit hard timeout.
 * Attaches no-op catch to input promise to prevent late unhandled rejections.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  promise.catch(() => {});
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
  });
  timeoutPromise.catch(() => {});
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

interface DbCheckResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

async function checkDatabase(): Promise<DbCheckResult> {
  const start = Date.now();
  try {
    if (isPostgres) {
      // In PostgreSQL: use SET LOCAL statement_timeout = 2500 inside a transaction
      // so the timeout only affects this transaction on the pooled connection.
      await withTimeout(
        db.transaction(async (tx) => {
          await (tx as any).execute(sql`SET LOCAL statement_timeout = 2500`);
          await (tx as any).execute(sql`SELECT 1`);
        }),
        3000,
        "Database healthcheck timed out after 3000ms"
      );
    } else {
      // In SQLite / LibSQL: statement_timeout does not exist; execute SELECT 1 with 3000ms timeout
      await withTimeout(
        (async () => {
          if (typeof (db as any).run === "function") {
            await (db as any).run(sql`SELECT 1`);
          } else if (typeof (db as any).execute === "function") {
            await (db as any).execute(sql`SELECT 1`);
          } else {
            await (db as any).query(sql`SELECT 1`);
          }
        })(),
        3000,
        "Database healthcheck timed out after 3000ms"
      );
    }
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: sanitizeErrorMessage(rawMsg),
    };
  }
}

interface RedisCheckResult {
  healthy: boolean;
  status: "ok" | "failed" | "not_configured";
  latencyMs?: number;
  error?: string;
}

async function checkRedis(): Promise<RedisCheckResult> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return { healthy: true, status: "not_configured" };
  }

  const start = Date.now();
  let client: any = null;
  try {
    const { createClient } = await import("redis");
    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 2500,
        reconnectStrategy: false,
      },
    });

    // Explicit error listener to prevent uncaught EventEmitter errors
    client.on("error", () => {});

    await withTimeout(
      (async () => {
        await client.connect();
        await client.ping();
      })(),
      3000,
      "Redis healthcheck timed out after 3000ms"
    );

    return { healthy: true, status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    return {
      healthy: false,
      status: "failed",
      latencyMs: Date.now() - start,
      error: sanitizeErrorMessage(rawMsg),
    };
  } finally {
    if (client) {
      try {
        await client.disconnect().catch(() => {});
      } catch {}
    }
  }
}

interface FcmCheckResult {
  healthy: boolean;
  status: "configured" | "not_configured";
}

function checkFCM(): FcmCheckResult {
  const isConfigured = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );

  return {
    healthy: true,
    status: isConfigured ? "configured" : "not_configured",
  };
}

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

  // Database is the sole readiness gate. Redis and FCM are non-gating telemetry.
  const [dbHealth, redisHealth, fcmHealth] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    Promise.resolve(checkFCM()),
  ]);

  const isReady = dbHealth.healthy;
  const statusCode = isReady ? 200 : 503;
  const status = isReady ? "ok" : "unhealthy";

  const recordApm = (code: number) => {
    if (process.env.APM_TELEMETRY_ENABLED === "false") return;
    const durationMs = Number((Date.now() - startTime).toFixed(2));
    try {
      SlidingWindowAggregator.getInstance().recordRequest("/api/system/health/ready", "GET", code, durationMs);
    } catch {}
  };

  recordApm(statusCode);

  // Unauthenticated requests receive minimal redaction response
  if (!isAuthorized) {
    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }

  // Authorized diagnostics with sanitized error telemetry
  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      version: process.env.APP_VERSION || "v3.42.1",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: dbHealth,
        redis: redisHealth,
        fcm: fcmHealth,
      },
    },
    { status: statusCode }
  );
}
