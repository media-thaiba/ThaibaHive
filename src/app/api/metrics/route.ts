/**
 * Prometheus OpenMetrics Scrape Endpoint
 * Sprint-038 / AGS-014
 */

import { GatewayMetricsTracker } from "@/lib/security/gateway-metrics";
import { soarMetricsTracker } from "@/lib/security/soar/soar-metrics";
import { zasmMetricsTracker } from "@/lib/security/zasm/zasm-metrics";
import { aresMetricsTracker } from "@/lib/security/ares/ares-metrics";
import { AimsMetricsTracker } from "@/lib/operations/persistence/aims-metrics";
import { AfedMetricsTracker } from "@/lib/operations/persistence/afed-metrics";
import { TwinMetrics } from "@/lib/operations/twin/telemetry/twin-metrics";

export async function GET() {
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

