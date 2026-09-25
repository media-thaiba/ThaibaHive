/**
 * Prometheus OpenMetrics Scrape Endpoint
 * Sprint-038 / AGS-014
 *
 * Phase 7 hardening (SEC): the route now requires a valid `x-metrics-secret`
 * header / `Bearer METRICS_SECRET` token (timing-safe) OR an authenticated
 * super_admin/admin session. Previously this endpoint was fully
 * unauthenticated, leaking operational telemetry to any caller who could
 * bypass the middleware auth check.
 */

import { NextResponse } from "next/server";
import { verifySession } from "@thaiba/auth";
import crypto from "crypto";
import { GatewayMetricsTracker } from "@/lib/security/gateway-metrics";
import { soarMetricsTracker } from "@/lib/security/soar/soar-metrics";
import { zasmMetricsTracker } from "@/lib/security/zasm/zasm-metrics";
import { aresMetricsTracker } from "@/lib/security/ares/ares-metrics";
import { AimsMetricsTracker } from "@/lib/operations/persistence/aims-metrics";
import { AfedMetricsTracker } from "@/lib/operations/persistence/afed-metrics";
import { TwinMetrics } from "@/lib/operations/twin/telemetry/twin-metrics";

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const gatewayMetricsText = GatewayMetricsTracker.getInstance().generateOpenMetricsText();
  const soarMetricsText = soarMetricsTracker.toOpenMetrics();
  const zasmMetricsText = zasmMetricsTracker.toOpenMetrics();
  const aresMetricsText = aresMetricsTracker.toOpenMetrics();
  const aimsMetricsText = AimsMetricsTracker.getInstance().exportOpenMetrics();
  const afedMetricsText = AfedMetricsTracker.getInstance().exportOpenMetrics();
  const twinMetricsText = TwinMetrics.getInstance().toPrometheusText();
  const fullMetricsText = `${gatewayMetricsText}\n\n# --- SOAR Orchestration Telemetry ---\n${soarMetricsText}\n\n# --- ZASM Zero-Trust Telemetry ---\n${zasmMetricsText}\n\n# --- ARES Predictive Resilience Telemetry ---\n${aresMetricsText}\n\n# --- AIMS Smart Campus Operations Telemetry ---\n${aimsMetricsText}\n\n# --- A-FED Federated Learning Telemetry ---\n${afedMetricsText}\n\n# --- TWIN-OPS Spatial Digital Twin Telemetry ---\n${twinMetricsText}`;

  return new Response(fullMetricsText, {
    status: 200,
    headers: {
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}

async function isAuthorized(request: Request): Promise<boolean> {
  const secretHeader = request.headers.get("x-metrics-secret") || "";
  const authHeader = request.headers.get("authorization") || "";
  const expectedSecret = process.env.METRICS_SECRET;

  if (expectedSecret) {
    let bearerToken = "";
    if (authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.substring(7);
    }
    const tokenToVerify = secretHeader || bearerToken;
    if (tokenToVerify) {
      const a = Buffer.from(tokenToVerify);
      const b = Buffer.from(expectedSecret);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    }
  }

  try {
    const session = await verifySession();
    if (session && (session.role === "super_admin" || session.role === "admin")) {
      return true;
    }
  } catch {
    // fall through to denial
  }

  return false;
}