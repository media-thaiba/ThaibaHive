import { NextResponse } from "next/server";
import { verifySession } from "@thaiba/auth";
import { SlidingWindowAggregator, type WindowPeriod } from "@/lib/observability/sliding-window-aggregator";
import { formatPrometheusMetrics } from "@/lib/observability/prometheus-exporter";
import crypto from "crypto";

// 1-second in-memory response cache store for scrape flood protection
interface CachedMetricsEntry {
  jsonBody: string;
  prometheusBody: string;
  expiresAt: number;
}
const metricsResponseCache = new Map<WindowPeriod, CachedMetricsEntry>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secretHeader = request.headers.get("x-metrics-secret") || "";
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.METRICS_SECRET;

  let isAuthorized = false;

  // 1. Fast shared secret check (zero JWT decode overhead for Prometheus scrapers)
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

  // 2. Fallback to session check if secret not supplied
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

  // 4. Check 1-second in-memory cache
  const now = Date.now();
  const cached = metricsResponseCache.get(windowPeriod);

  let jsonResponse: string;
  let prometheusResponse: string;

  if (cached && cached.expiresAt > now) {
    jsonResponse = cached.jsonBody;
    prometheusResponse = cached.prometheusBody;
  } else {
    const snapshot = SlidingWindowAggregator.getInstance().getMetricsSnapshot(windowPeriod);
    const { MobileSyncTelemetryAggregator } = require("@/lib/observability/mobile-sync-telemetry-aggregator");
    const mobileSync = MobileSyncTelemetryAggregator.getInstance().getSummary();
    const enrichedSnapshot = { ...snapshot, mobileSync };

    jsonResponse = JSON.stringify(enrichedSnapshot);
    prometheusResponse = formatPrometheusMetrics(snapshot);

    metricsResponseCache.set(windowPeriod, {
      jsonBody: jsonResponse,
      prometheusBody: prometheusResponse,
      expiresAt: now + 1000, // 1-second cache TTL
    });
  }

  // 5. Content negotiation (Prometheus vs JSON)
  const acceptHeader = request.headers.get("accept") || "";
  const formatParam = url.searchParams.get("format");

  if (formatParam === "prometheus" || acceptHeader.includes("text/plain")) {
    return new Response(prometheusResponse, {
      status: 200,
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
        "cache-control": "private, max-age=1",
      },
    });
  }

  return new Response(jsonResponse, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, max-age=1",
    },
  });
}
