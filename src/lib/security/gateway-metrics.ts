/**
 * Gateway Telemetry & Prometheus OpenMetrics Exporter
 * Sprint-038 / AGS-014 & Sprint-039 / TIF-017
 */

export interface GatewayMetricCounters {
  requestsTotal: number;
  rateLimitViolationsTotal: number;
  activeQuarantines: number;
  circuitBreakerState: number; // 0=CLOSED, 1=HALF_OPEN, 2=OPEN
  probeDurationSum: number;
  probeDurationCount: number;
  threatScoreSum: number;
  threatScoreCount: number;
  threatIndicatorsImportedTotal: number;
  meshPubSubEventsTotal: number;
  meshPubSubSyncLatencySum: number;
  meshPubSubSyncLatencyCount: number;
  legacyTokenRejectionsTotal: number;
  dbQuarantineSyncDurationSum: number;
  dbQuarantineSyncDurationCount: number;
  wafSigV4RequestsTotal: number;
}

export class GatewayMetricsTracker {
  private static instance: GatewayMetricsTracker | null = null;
  private counters: GatewayMetricCounters = {
    requestsTotal: 0,
    rateLimitViolationsTotal: 0,
    activeQuarantines: 0,
    circuitBreakerState: 0,
    probeDurationSum: 0,
    probeDurationCount: 0,
    threatScoreSum: 0,
    threatScoreCount: 0,
    threatIndicatorsImportedTotal: 0,
    meshPubSubEventsTotal: 0,
    meshPubSubSyncLatencySum: 0,
    meshPubSubSyncLatencyCount: 0,
    legacyTokenRejectionsTotal: 0,
    dbQuarantineSyncDurationSum: 0,
    dbQuarantineSyncDurationCount: 0,
    wafSigV4RequestsTotal: 0,
  };

  public static getInstance(): GatewayMetricsTracker {
    if (!GatewayMetricsTracker.instance) {
      GatewayMetricsTracker.instance = new GatewayMetricsTracker();
    }
    return GatewayMetricsTracker.instance;
  }

  public recordRequest(): void {
    this.counters.requestsTotal++;
  }

  public recordRateLimitViolation(): void {
    this.counters.rateLimitViolationsTotal++;
  }

  public setActiveQuarantines(count: number): void {
    this.counters.activeQuarantines = count;
  }

  public setCircuitBreakerState(state: "CLOSED" | "HALF_OPEN" | "OPEN"): void {
    this.counters.circuitBreakerState = state === "CLOSED" ? 0 : state === "HALF_OPEN" ? 1 : 2;
  }

  public recordProbeDuration(durationSeconds: number): void {
    this.counters.probeDurationSum += durationSeconds;
    this.counters.probeDurationCount++;
  }

  public recordThreatScore(score: number): void {
    this.counters.threatScoreSum += score;
    this.counters.threatScoreCount++;
  }

  public recordThreatIndicatorsImported(count: number = 1): void {
    this.counters.threatIndicatorsImportedTotal += count;
  }

  public recordMeshPubSubEvent(latencySeconds?: number): void {
    this.counters.meshPubSubEventsTotal++;
    if (latencySeconds !== undefined) {
      this.counters.meshPubSubSyncLatencySum += latencySeconds;
      this.counters.meshPubSubSyncLatencyCount++;
    }
  }

  public recordLegacyTokenRejection(): void {
    this.counters.legacyTokenRejectionsTotal++;
  }

  public recordDbSyncDuration(durationSeconds: number): void {
    this.counters.dbQuarantineSyncDurationSum += durationSeconds;
    this.counters.dbQuarantineSyncDurationCount++;
  }

  public recordWafSigV4Request(): void {
    this.counters.wafSigV4RequestsTotal++;
  }

  public getCounters(): GatewayMetricCounters {
    return { ...this.counters };
  }

  /**
   * Generates Prometheus / OpenMetrics compliant text format for scraping.
   */
  public generateOpenMetricsText(): string {
    const lines: string[] = [
      "# HELP gateway_requests_total Total incoming requests evaluated by gateway shield",
      "# TYPE gateway_requests_total counter",
      `gateway_requests_total ${this.counters.requestsTotal}`,
      "",
      "# HELP gateway_ratelimit_violations_total Total 429 Too Many Requests rejections",
      "# TYPE gateway_ratelimit_violations_total counter",
      `gateway_ratelimit_violations_total ${this.counters.rateLimitViolationsTotal}`,
      "",
      "# HELP gateway_ip_quarantines_active Total active IP and CIDR subnet quarantines",
      "# TYPE gateway_ip_quarantines_active gauge",
      `gateway_ip_quarantines_active ${this.counters.activeQuarantines}`,
      "",
      "# HELP gateway_circuit_breaker_state Current circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)",
      "# TYPE gateway_circuit_breaker_state gauge",
      `gateway_circuit_breaker_state ${this.counters.circuitBreakerState}`,
      "",
      "# HELP gateway_canary_probe_duration_seconds Synthetic canary probe duration in seconds",
      "# TYPE gateway_canary_probe_duration_seconds summary",
      `gateway_canary_probe_duration_seconds_sum ${this.counters.probeDurationSum.toFixed(4)}`,
      `gateway_canary_probe_duration_seconds_count ${this.counters.probeDurationCount}`,
      "",
      "# HELP gateway_threat_score_distribution Calculated IP threat reputation score distribution",
      "# TYPE gateway_threat_score_distribution summary",
      `gateway_threat_score_distribution_sum ${this.counters.threatScoreSum}`,
      `gateway_threat_score_distribution_count ${this.counters.threatScoreCount}`,
      "",
      "# HELP threat_intel_indicators_imported_total Total external STIX 2.1 threat indicators ingested",
      "# TYPE threat_intel_indicators_imported_total counter",
      `threat_intel_indicators_imported_total ${this.counters.threatIndicatorsImportedTotal}`,
      "",
      "# HELP mesh_pubsub_events_total Total Redis PubSub quarantine mesh broadcast events",
      "# TYPE mesh_pubsub_events_total counter",
      `mesh_pubsub_events_total ${this.counters.meshPubSubEventsTotal}`,
      "",
      "# HELP mesh_pubsub_sync_latency_seconds Latency of Redis PubSub quarantine synchronization in seconds",
      "# TYPE mesh_pubsub_sync_latency_seconds summary",
      `mesh_pubsub_sync_latency_seconds_sum ${this.counters.meshPubSubSyncLatencySum.toFixed(4)}`,
      `mesh_pubsub_sync_latency_seconds_count ${this.counters.meshPubSubSyncLatencyCount}`,
      "",
      "# HELP legacy_token_rejections_total Total non-DPoP legacy tokens rejected under sunset policy",
      "# TYPE legacy_token_rejections_total counter",
      `legacy_token_rejections_total ${this.counters.legacyTokenRejectionsTotal}`,
      "",
      "# HELP db_quarantine_sync_duration_seconds Duration of database quarantine dual-write persistence in seconds",
      "# TYPE db_quarantine_sync_duration_seconds summary",
      `db_quarantine_sync_duration_seconds_sum ${this.counters.dbQuarantineSyncDurationSum.toFixed(4)}`,
      `db_quarantine_sync_duration_seconds_count ${this.counters.dbQuarantineSyncDurationCount}`,
      "",
      "# HELP waf_sigv4_requests_total Total AWS WAF SigV4 signed requests dispatched",
      "# TYPE waf_sigv4_requests_total counter",
      `waf_sigv4_requests_total ${this.counters.wafSigV4RequestsTotal}`,
      "",
    ];

    return lines.join("\n");
  }

  public reset(): void {
    this.counters = {
      requestsTotal: 0,
      rateLimitViolationsTotal: 0,
      activeQuarantines: 0,
      circuitBreakerState: 0,
      probeDurationSum: 0,
      probeDurationCount: 0,
      threatScoreSum: 0,
      threatScoreCount: 0,
      threatIndicatorsImportedTotal: 0,
      meshPubSubEventsTotal: 0,
      meshPubSubSyncLatencySum: 0,
      meshPubSubSyncLatencyCount: 0,
      legacyTokenRejectionsTotal: 0,
      dbQuarantineSyncDurationSum: 0,
      dbQuarantineSyncDurationCount: 0,
      wafSigV4RequestsTotal: 0,
    };
  }
}
