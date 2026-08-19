/**
 * Unified Metrics Registry for ThaibaHive (Sprint-037 / Sprint-038 / Sprint-039)
 * Central catalog of all registered metric names, types, and descriptions.
 */

export interface MetricDefinition {
  name: string;
  type: "counter" | "gauge" | "histogram" | "summary";
  help: string;
  module: "core" | "edge" | "cache" | "compliance" | "identity" | "revocation" | "gateway" | "threat_intel" | "soar";
  labels?: string[];
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // SOAR Autonomous Security Orchestration Metrics (Sprint-040)
  soar_playbook_executions_total: {
    name: "soar_playbook_executions_total",
    type: "counter",
    help: "Total autonomous and manual SOAR playbook executions",
    module: "soar",
    labels: ["playbook", "status", "trigger"],
  },
  soar_playbook_duration_seconds: {
    name: "soar_playbook_duration_seconds",
    type: "summary",
    help: "Duration of SOAR playbook executions from trigger to resolution in seconds",
    module: "soar",
    labels: ["playbook"],
  },
  soar_actions_executed_total: {
    name: "soar_actions_executed_total",
    type: "counter",
    help: "Total individual security actions executed across all playbooks",
    module: "soar",
    labels: ["action", "status"],
  },
  soar_pending_approvals_total: {
    name: "soar_pending_approvals_total",
    type: "gauge",
    help: "Current number of pending human-in-the-loop security approvals",
    module: "soar",
  },
  soar_compensations_total: {
    name: "soar_compensations_total",
    type: "counter",
    help: "Total SAGA compensation rollback operations executed on playbook failures",
    module: "soar",
    labels: ["playbook", "status"],
  },
  soar_confidence_score_distribution: {
    name: "soar_confidence_score_distribution",
    type: "summary",
    help: "Distribution of incoming threat confidence scores processed by SOAR confidence gate",
    module: "soar",
    labels: ["tier"],
  },
  // Identity Security Metrics
  identity_dpop_validation_ms: {
    name: "identity_dpop_validation_ms",
    type: "summary",
    help: "DPoP proof validation latency in milliseconds",
    module: "identity",
  },
  identity_dpop_replay_rejected_total: {
    name: "identity_dpop_replay_rejected_total",
    type: "counter",
    help: "Total DPoP proofs rejected due to replay detection",
    module: "identity",
  },
  identity_risk_score_distribution: {
    name: "identity_risk_score_distribution",
    type: "summary",
    help: "Continuous risk engine score distribution (0-100)",
    module: "identity",
  },
  identity_stepup_triggered_total: {
    name: "identity_stepup_triggered_total",
    type: "counter",
    help: "Total step-up MFA/WebAuthn challenges triggered by elevated risk",
    module: "identity",
  },
  identity_stepup_completed_total: {
    name: "identity_stepup_completed_total",
    type: "counter",
    help: "Total step-up MFA/WebAuthn challenges successfully verified",
    module: "identity",
  },
  identity_device_fingerprint_drift_total: {
    name: "identity_device_fingerprint_drift_total",
    type: "counter",
    help: "Total device fingerprint drift events flagged",
    module: "identity",
  },

  // Revocation Mesh Metrics
  identity_revocation_propagation_ms: {
    name: "identity_revocation_propagation_ms",
    type: "summary",
    help: "Edge revocation mesh propagation latency across nodes in ms",
    module: "revocation",
  },
  identity_revocation_bloom_size: {
    name: "identity_revocation_bloom_size",
    type: "gauge",
    help: "In-memory bloom filter allocation footprint in bytes",
    module: "revocation",
  },
  identity_revocation_fallback_total: {
    name: "identity_revocation_fallback_total",
    type: "counter",
    help: "Total operations falling back to database during Redis partition",
    module: "revocation",
  },
  identity_active_sessions_total: {
    name: "identity_active_sessions_total",
    type: "gauge",
    help: "Total active sessions monitored across edge nodes",
    module: "revocation",
  },

  // API Gateway Security & Rate Limiting Metrics (Sprint-038)
  gateway_requests_total: {
    name: "gateway_requests_total",
    type: "counter",
    help: "Total incoming requests processed by API gateway rate limiting shield",
    module: "gateway",
    labels: ["tenant", "tier", "role"],
  },
  gateway_ratelimit_violations_total: {
    name: "gateway_ratelimit_violations_total",
    type: "counter",
    help: "Total 429 Too Many Requests rejections issued by gateway",
    module: "gateway",
    labels: ["tier", "reason"],
  },
  gateway_ip_quarantines_active: {
    name: "gateway_ip_quarantines_active",
    type: "gauge",
    help: "Total active IP and CIDR subnet quarantines in effect",
    module: "gateway",
  },
  gateway_ip_quarantines_total: {
    name: "gateway_ip_quarantines_total",
    type: "counter",
    help: "Cumulative count of IP quarantines applied across lifetime",
    module: "gateway",
  },
  gateway_canary_probe_duration_seconds: {
    name: "gateway_canary_probe_duration_seconds",
    type: "summary",
    help: "Synthetic canary probe roundtrip latency in seconds",
    module: "gateway",
    labels: ["route", "status"],
  },
  gateway_circuit_breaker_state: {
    name: "gateway_circuit_breaker_state",
    type: "gauge",
    help: "Current gateway circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)",
    module: "gateway",
  },
  gateway_threat_score_distribution: {
    name: "gateway_threat_score_distribution",
    type: "summary",
    help: "Distribution of calculated IP threat reputation scores (0-100)",
    module: "gateway",
  },
  gateway_degraded_mode_shed_requests_total: {
    name: "gateway_degraded_mode_shed_requests_total",
    type: "counter",
    help: "Total non-critical requests shed during gateway degraded mode",
    module: "gateway",
  },
  gateway_subnet_containments_total: {
    name: "gateway_subnet_containments_total",
    type: "counter",
    help: "Total automated /24 CIDR subnet containment triggers",
    module: "gateway",
  },
  gateway_waf_dispatches_total: {
    name: "gateway_waf_dispatches_total",
    type: "counter",
    help: "Total outbound firewall blocks dispatched to Cloudflare / AWS WAF",
    module: "gateway",
    labels: ["provider"],
  },
  gateway_waf_dispatch_failures_total: {
    name: "gateway_waf_dispatch_failures_total",
    type: "counter",
    help: "Total upstream WAF dispatch failures",
    module: "gateway",
  },
  gateway_fallback_activations_total: {
    name: "gateway_fallback_activations_total",
    type: "counter",
    help: "Total activations of in-memory fallback rate limit store",
    module: "gateway",
  },

  // Enterprise Threat Intelligence & Mesh Metrics (Sprint-039)
  threat_intel_indicators_imported_total: {
    name: "threat_intel_indicators_imported_total",
    type: "counter",
    help: "Total external STIX 2.1 threat indicators ingested into reputation engine",
    module: "threat_intel",
    labels: ["feed_id", "indicator_type"],
  },
  mesh_pubsub_sync_latency_seconds: {
    name: "mesh_pubsub_sync_latency_seconds",
    type: "summary",
    help: "Latency of cross-node Redis PubSub quarantine synchronization in seconds",
    module: "gateway",
  },
  mesh_pubsub_events_total: {
    name: "mesh_pubsub_events_total",
    type: "counter",
    help: "Total Redis PubSub quarantine mesh broadcast events",
    module: "gateway",
    labels: ["action", "status"],
  },
  legacy_token_rejections_total: {
    name: "legacy_token_rejections_total",
    type: "counter",
    help: "Total non-DPoP legacy token authentication attempts rejected under sunset policy",
    module: "identity",
    labels: ["mode", "client"],
  },
  db_quarantine_sync_duration_seconds: {
    name: "db_quarantine_sync_duration_seconds",
    type: "summary",
    help: "Duration of dual-store database quarantine persistence operations in seconds",
    module: "gateway",
  },
  waf_sigv4_requests_total: {
    name: "waf_sigv4_requests_total",
    type: "counter",
    help: "Total AWS WAF SigV4 signed requests dispatched",
    module: "gateway",
    labels: ["action", "status"],
  },
};

export class MetricsRegistry {
  private static instance: MetricsRegistry;

  private constructor() {}

  static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }

  getDefinitions(): MetricDefinition[] {
    return Object.values(METRIC_DEFINITIONS);
  }

  getDefinitionsByModule(module: MetricDefinition["module"]): MetricDefinition[] {
    return Object.values(METRIC_DEFINITIONS).filter((m) => m.module === module);
  }
}

export const metricsRegistry = MetricsRegistry.getInstance();
