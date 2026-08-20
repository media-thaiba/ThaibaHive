/**
 * Prometheus OpenMetrics Scrape Endpoint
 * Sprint-038 / AGS-014
 */

import { GatewayMetricsTracker } from "@/lib/security/gateway-metrics";
import { soarMetricsTracker } from "@/lib/security/soar/soar-metrics";
import { zasmMetricsTracker } from "@/lib/security/zasm/zasm-metrics";
import { aresMetricsTracker } from "@/lib/security/ares/ares-metrics";

export async function GET() {
  const gatewayMetricsText = GatewayMetricsTracker.getInstance().generateOpenMetricsText();
  const soarMetricsText = soarMetricsTracker.toOpenMetrics();
  const zasmMetricsText = zasmMetricsTracker.toOpenMetrics();
  const aresMetricsText = aresMetricsTracker.toOpenMetrics();
  const fullMetricsText = `${gatewayMetricsText}\n\n# --- SOAR Orchestration Telemetry ---\n${soarMetricsText}\n\n# --- ZASM Zero-Trust Telemetry ---\n${zasmMetricsText}\n\n# --- ARES Predictive Resilience Telemetry ---\n${aresMetricsText}`;

  return new Response(fullMetricsText, {
    status: 200,
    headers: {
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}

