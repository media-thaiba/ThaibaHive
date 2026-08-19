import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";

// ─── Identity Audit Event Types ───────────────────────────────────────────────

export type IdentityEventType =
  | "dpop.proof.validated"
  | "dpop.proof.rejected"
  | "session.revoked"
  | "risk.stepup.triggered"
  | "risk.stepup.completed"
  | "risk.stepup.failed"
  | "fingerprint.drift.detected"
  | "migration.token.legacy"
  | "revocation.propagated";

export interface IdentityAuditPayload {
  eventType: IdentityEventType;
  userId: string;
  institutionId?: string;
  deviceThumbprint?: string;
  riskScore?: number;
  triggers?: string[];
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

const EVENT_ACTION_MAP: Record<IdentityEventType, string> = {
  "dpop.proof.validated":      "IDENTITY_DPOP_VALIDATED",
  "dpop.proof.rejected":       "IDENTITY_DPOP_REJECTED",
  "session.revoked":           "IDENTITY_SESSION_REVOKED",
  "risk.stepup.triggered":     "IDENTITY_STEPUP_TRIGGERED",
  "risk.stepup.completed":     "IDENTITY_STEPUP_COMPLETED",
  "risk.stepup.failed":        "IDENTITY_STEPUP_FAILED",
  "fingerprint.drift.detected":"IDENTITY_FINGERPRINT_DRIFT",
  "migration.token.legacy":    "IDENTITY_MIGRATION_LEGACY",
  "revocation.propagated":     "IDENTITY_REVOCATION_PROPAGATED",
};

/**
 * Logs an identity security event to the cryptographic audit chain (Sprint-036).
 * All events are SHA-256 block-chained and tamper-proof.
 */
export async function logIdentityEvent(payload: IdentityAuditPayload): Promise<void> {
  const action = EVENT_ACTION_MAP[payload.eventType];

  await cryptoAuditWriter.log({
    tenantId: payload.institutionId ?? "default",
    userId:   payload.userId,
    action,
    entityType: "IDENTITY",
    entityId:   payload.deviceThumbprint ?? payload.userId,
    ipAddress:  payload.ipAddress,
    userAgent:  payload.userAgent,
    payload: {
      eventType:        payload.eventType,
      riskScore:        payload.riskScore,
      triggers:         payload.triggers,
      reason:           payload.reason,
      deviceThumbprint: payload.deviceThumbprint,
    },
    timestamp: new Date().toISOString(),
  });
}
