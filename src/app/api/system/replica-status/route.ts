import { NextResponse } from "next/server";
import { verifySession } from "@thaiba/auth";
import { ReplicaHealthTracker } from "@/lib/db/replica-health";
import { SlidingWindowAggregator } from "@/lib/observability/sliding-window-aggregator";
import crypto from "crypto";

export async function GET(request: Request) {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const secretHeader = request.headers.get("x-health-secret") || request.headers.get("x-replica-secret") || "";
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.HEALTH_SECRET || process.env.REPLICA_SECRET;

  let isAuthorized = false;

  if (expectedSecret) {
    let bearerToken = "";
    if (authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.substring(7);
    }
    const tokenToVerify = secretHeader || bearerToken;
    if (tokenToVerify) {
      const a = Buffer.from(tokenToVerify);
      const b = Buffer.from(expectedSecret);
      if (a.length === b.length) {
        isAuthorized = crypto.timingSafeEqual(a, b);
      }
    }
  }

  if (!isAuthorized) {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role !== "super_admin" && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Administrator role required" }, { status: 403 });
    }
    isAuthorized = true;
  }

  try {
    const report = await ReplicaHealthTracker.getInstance().checkClusterHealth();
    
    if (process.env.APM_TELEMETRY_ENABLED !== "false") {
      const durationMs = Number(((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime).toFixed(2));
      try {
        SlidingWindowAggregator.getInstance().recordRequest(
          "/api/system/replica-status",
          "GET",
          200,
          durationMs
        );
      } catch {}
    }

    return NextResponse.json(report, {
      status: 200,
      headers: {
        "cache-control": "private, no-cache, no-store",
      },
    });
  } catch (err: any) {
    console.error("[ReplicaStatusAPI] Error checking replica health:", err);
    return NextResponse.json(
      { error: "Failed to query replica health", details: err?.message },
      { status: 500 }
    );
  }
}
