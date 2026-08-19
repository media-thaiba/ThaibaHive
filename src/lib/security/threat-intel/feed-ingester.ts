/**
 * Threat Feed Ingester Pipeline
 * Sprint-039 / TIF-011 & TIF-017
 */

import { ThreatFeedConfig } from "./threat-feed-config";
import { StixBundle } from "./stix-types";
import { StixParser } from "./stix-parser";
import { QuarantineManager } from "../quarantine-manager";
import { IpReputationEngine } from "../ip-reputation";
import { logGatewayThreatEvent } from "../threat-audit-events";
import { GatewayMetricsTracker } from "../gateway-metrics";

export interface IngestionSummary {
  feedId: string;
  totalParsed: number;
  quarantinedCount: number;
  reputationPenalizedCount: number;
  skippedExpiredCount: number;
  timestamp: string;
}

export class ThreatFeedIngester {
  private static instance: ThreatFeedIngester | null = null;

  public static getInstance(): ThreatFeedIngester {
    if (!ThreatFeedIngester.instance) {
      ThreatFeedIngester.instance = new ThreatFeedIngester();
    }
    return ThreatFeedIngester.instance;
  }

  /**
   * Ingests a STIX bundle from a threat feed into reputation engine and quarantine manager.
   */
  public async ingestBundle(
    feed: ThreatFeedConfig,
    bundle: StixBundle,
    nowMs: number = Date.now()
  ): Promise<IngestionSummary> {
    const indicators = StixParser.parseBundle(bundle, nowMs);

    let quarantinedCount = 0;
    let reputationPenalizedCount = 0;
    let skippedExpiredCount = 0;

    const quarantineManager = QuarantineManager.getInstance();
    const reputationEngine = IpReputationEngine.getInstance();

    for (const ind of indicators) {
      if (ind.isExpired) {
        skippedExpiredCount++;
        continue;
      }

      if (ind.type === "ipv4-addr" || ind.type === "ipv6-addr" || ind.type === "cidr") {
        // Dispatch to SOAR threat intelligence bridge asynchronously (ASOR-007)
        try {
          const { ThreatIntelBridge } = require("../soar/threat-intel-bridge");
          ThreatIntelBridge.getInstance().handleThreatEvent(
            {
              event_type: "THREAT_INTEL_INDICATOR",
              severity: ind.confidence >= 80 ? "HIGH" : "MEDIUM",
              source: `feed:${feed.id}`,
              confidence: ind.confidence,
              payload: {
                indicator_value: ind.value,
                indicator_type: ind.type,
                feed_id: feed.id,
                feed_name: feed.name,
              },
            },
            {
              type: ind.type === "cidr" ? "SUBNET" : "IP",
              value: ind.value,
            }
          ).catch(() => {});
        } catch {
          // SOAR module optional / silent fallback
        }

        if (ind.confidence >= feed.autoQuarantineConfidenceThreshold) {
          const reason = `[Threat Feed: ${feed.name}] ${ind.description || "Known malicious IP indicator"} (Confidence: ${ind.confidence}%)`;
          quarantineManager.quarantineIp(
            ind.value,
            reason,
            24 * 60 * 60 * 1000, // 24-hour ban
            "default",
            `feed:${feed.id}`,
            ind.confidence
          );
          quarantinedCount++;
        } else {
          reputationEngine.recordSignal(ind.value, "not_found_scan", {
            feedId: feed.id,
            feedName: feed.name,
            confidence: ind.confidence,
          });
          reputationPenalizedCount++;
        }
      }
    }

    // Record OpenMetrics counter (TIF-017)
    GatewayMetricsTracker.getInstance().recordThreatIndicatorsImported(indicators.length);

    // Emit semantic audit event (TIF-011)
    logGatewayThreatEvent({
      eventType: "gateway.ip.quarantined",
      reason: `Threat feed ${feed.name} synced: ${indicators.length} indicators, ${quarantinedCount} quarantined`,
      metadata: {
        feedId: feed.id,
        feedName: feed.name,
        action: "THREAT_INTEL_FEED_SYNCED",
        totalParsed: indicators.length,
        quarantinedCount,
        reputationPenalizedCount,
      },
    }).catch(() => {});

    return {
      feedId: feed.id,
      totalParsed: indicators.length,
      quarantinedCount,
      reputationPenalizedCount,
      skippedExpiredCount,
      timestamp: new Date().toISOString(),
    };
  }
}
