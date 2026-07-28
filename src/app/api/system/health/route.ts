import { NextResponse } from "next/server";
import { db, sql } from "@/db";

export async function GET(request: Request) {
  const startTime = Date.now();
  const secretHeader = request.headers.get("x-health-secret");
  const expectedSecret = process.env.HEALTH_SECRET;
  const isAuthorized = Boolean(expectedSecret && secretHeader && secretHeader === expectedSecret);

  try {
    // Perform fast database ping query
    await db.run(sql`SELECT 1`);
    const responseTimeMs = Date.now() - startTime;

    if (!isAuthorized) {
      return NextResponse.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

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
    console.error("[HealthCheck] Database ping failed:", error);
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
