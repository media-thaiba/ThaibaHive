/**
 * ARES Cryptographic Merkle Audit Event Creators
 * Sprint-042 (ARES) — ARES-018
 */

import { cryptoAuditWriter } from '@/lib/audit/crypto-writer';

export type AresAuditEventType =
  | 'ARES_THREAT_PREDICTED'
  | 'ARES_HARDENING_APPLIED'
  | 'CHAOS_EXPERIMENT_SCHEDULED'
  | 'CHAOS_FAULT_INJECTED'
  | 'CHAOS_EXPERIMENT_COMPLETED'
  | 'CHAOS_EMERGENCY_ABORT'
  | 'ZKP_PROOF_GENERATED'
  | 'ZKP_PROOF_VERIFIED'
  | 'RESILIENCE_SCORE_CALCULATED';

export class AresAuditLogger {
  public static async logEvent(
    action: AresAuditEventType,
    entityId: string,
    payload: Record<string, unknown>,
    tenantId: string = 'global',
    userId: string = 'system:ares'
  ): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId,
        userId,
        action,
        entityType: 'PREDICTIVE_RESILIENCE',
        entityId,
        payload,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // Non-blocking telemetry
      console.error('AresAuditLogger: Failed to write Merkle audit block:', err);
    }
  }
}
