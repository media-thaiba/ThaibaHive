import { NextResponse } from "next/server";
import { verifySession } from "@thaiba/auth";
import { SlidingWindowAggregator, type WindowPeriod } from "@/lib/observability/sliding-window-aggregator";
import { formatPrometheusMetrics } from "@/lib/observability/prometheus-exporter";
import crypto from "crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secretHeader = request.headers.get("x-metrics-secret") || "";
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.METRICS_SECRET;

  let isAuthorized = false;

  // 1. Check shared secret (if configured)
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

  // 2. Check user session if secret auth not satisfied
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

  // 3. Extract window query parameter
  const rawWindow = url.searchParams.get("window") as WindowPeriod;
  const validWindows: WindowPeriod[] = ["1m", "5m", "15m", "1h"];
  const windowPeriod: WindowPeriod = validWindows.includes(rawWindow) ? rawWindow : "5m";

  const snapshot = SlidingWindowAggregator.getInstance().getMetricsSnapshot(windowPeriod);

  // 4. Content negotiation (Prometheus vs JSON)
  const acceptHeader = request.headers.get("accept") || "";
  const formatParam = url.searchParams.get("format");

  if (formatParam === "prometheus" || acceptHeader.includes("text/plain")) {
    const prometheusText = formatPrometheusMetrics(snapshot);
    return new Response(prometheusText, {
      status: 200,
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
        "cache-control": "private, max-age=1",
      },
    });
  }

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, max-age=1",
    },
  });
}
