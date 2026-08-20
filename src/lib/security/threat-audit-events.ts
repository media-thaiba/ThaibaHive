/**
 * Gateway Threat Audit Integration with Cryptographic Merkle Chain
 * Sprint-038 / AGS-015
 */

import { cryptoAuditWriter } from "../audit/crypto-writer";
import { AUDIT_EVENT_TYPES } from "../audit/audit-event-types";

export type GatewayThreatEventType =
  | "gateway.ratelimit.exceeded"
  | "gateway.ip.quarantined"
  | "gateway.ip.unbanned"
  | "gateway.subnet.contained"
  | "gateway.circuit.tripped"
  | "gateway.circuit.reset"
  | "gateway.waf.dispatch_failed"
  | "gateway.degraded.entered";

export interface GatewayThreatAuditPayload {
  eventType: GatewayThreatEventType;
  tenantId?: string;
  ipAddress?: string;
  userId?: string;
  cidrMask?: string;
  reason?: string;
  threatScore?: number;
  circuitState?: string;
  metadata?: Record<string, unknown>;
}

const ACTION_MAP: Record<GatewayThreatEventType, string> = {
  "gateway.ratelimit.exceeded": "GATEWAY_RATE_LIMIT_EXCEEDED",
  "gateway.ip.quarantined": "GATEWAY_IP_QUARANTINED",
  "gateway.ip.unbanned": "GATEWAY_IP_UNBANNED",
  "gateway.subnet.contained": "GATEWAY_SUBNET_CONTAINED",
  "gateway.circuit.tripped": "GATEWAY_CIRCUIT_TRIPPED",
  "gateway.circuit.reset": "GATEWAY_CIRCUIT_RESET",
  "gateway.waf.dispatch_failed": "GATEWAY_WAF_FAILED",
  "gateway.degraded.entered": "GATEWAY_DEGRADED_MODE",
};

/**
 * Logs a gateway threat or security shield event to the Merkle audit chain.
 */
export async function logGatewayThreatEvent(payload: GatewayThreatAuditPayload): Promise<void> {
  const action = ACTION_MAP[payload.eventType] || "GATEWAY_SECURITY_EVENT";

  try {
    await cryptoAuditWriter.log({
      tenantId: payload.tenantId || "default",
      userId: payload.userId || "system:gateway",
      action,
      entityType: "GATEWAY_SECURITY",
      entityId: payload.ipAddress || payload.userId || "gateway",
      ipAddress: payload.ipAddress,
      payload: {
        eventType: payload.eventType,
        reason: payload.reason,
        threatScore: payload.threatScore,
        cidrMask: payload.cidrMask,
        circuitState: payload.circuitState,
        ...payload.metadata,
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Non-blocking telemetry
  }
}

export { ZasmAuditLogger } from "./zasm/zasm-audit-events";
export { AresAuditLogger } from "./ares/ares-audit-events";

