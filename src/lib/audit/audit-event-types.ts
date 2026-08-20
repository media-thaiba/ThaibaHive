/**
 * Canonical Audit Event Types for ThaibaHive (Sprint-036 / Sprint-037 / Sprint-038)
 */
export const AUDIT_EVENT_TYPES = {
  // Gateway Threat & Security Shield Events (Sprint-038)
  GATEWAY_RATE_LIMIT_EXCEEDED: "gateway.ratelimit.exceeded",
  GATEWAY_IP_QUARANTINED: "gateway.ip.quarantined",
  GATEWAY_IP_UNBANNED: "gateway.ip.unbanned",
  GATEWAY_SUBNET_CONTAINED: "gateway.subnet.contained",
  GATEWAY_CIRCUIT_BREAKER_TRIPPED: "gateway.circuit.tripped",
  GATEWAY_CIRCUIT_BREAKER_RESET: "gateway.circuit.reset",
  GATEWAY_WAF_DISPATCH_FAILED: "gateway.waf.dispatch_failed",
  GATEWAY_DEGRADED_MODE_ENTERED: "gateway.degraded.entered",

  // Identity & DPoP Events (Sprint-037)
  DPOP_PROOF_VALIDATED: "dpop.proof.validated",
  DPOP_PROOF_REJECTED: "dpop.proof.rejected",
  SESSION_REVOKED: "session.revoked",
  RISK_STEPUP_TRIGGERED: "risk.stepup.triggered",
  RISK_STEPUP_COMPLETED: "risk.stepup.completed",
  RISK_STEPUP_FAILED: "risk.stepup.failed",
  FINGERPRINT_DRIFT_DETECTED: "fingerprint.drift.detected",
  MIGRATION_TOKEN_LEGACY: "migration.token.legacy",
  REVOCATION_PROPAGATED: "revocation.propagated",

  // Core System & Compliance Events (Sprint-036)
  COMPLIANCE_SNAPSHOT_CREATED: "compliance.snapshot.created",
  COMPLIANCE_VIOLATION_RECORDED: "compliance.violation.recorded",
  CRYPTO_MERKLE_ROOT_ANCHORED: "crypto.merkle.anchored",
  TENANT_MIGRATION_EXECUTED: "tenant.migration.executed",

  // Smart Campus & Operations Events (Sprint-043)
  AIMS_ENERGY_OPTIMIZED: "aims.energy.optimized",
  AIMS_FLEET_DISPATCHED: "aims.fleet.dispatched",
  AIMS_BIOMETRIC_VERIFIED: "aims.biometric.verified",
  AIMS_CLOUD_RIGHTSIZED: "aims.cloud.rightsized",
  AIMS_CARBON_RECORDED: "aims.carbon.recorded",
  AIMS_RESOURCE_ALLOCATED: "aims.resource.allocated",
  AIMS_MARL_DECISION: "aims.marl.decision",
  AIMS_KILL_SWITCH: "aims.kill_switch.triggered",
} as const;

export type AuditEventType = typeof AUDIT_EVENT_TYPES[keyof typeof AUDIT_EVENT_TYPES];

