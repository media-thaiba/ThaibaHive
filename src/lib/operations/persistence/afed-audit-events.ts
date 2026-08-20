import { cryptoAuditWriter } from '@/lib/audit/crypto-writer';

export type AfedEventType =
  | 'afed.model.registered'
  | 'afed.round.completed'
  | 'afed.privacy.budget_consumed'
  | 'afed.privacy.budget_exhausted'
  | 'afed.drift.detected'
  | 'afed.model.promoted'
  | 'afed.smpc.aggregated'
  | 'afed.benchmark.computed';

export interface AfedAuditPayload {
  eventType: AfedEventType;
  tenantId?: string;
  userId?: string;
  modelId?: string;
  roundNumber?: number;
  details?: Record<string, unknown>;
}

export class AfedAuditLogger {
  public static async logEvent(payload: AfedAuditPayload): Promise<void> {
    try {
      await cryptoAuditWriter.log({
        tenantId: payload.tenantId || 'global',
        userId: payload.userId || 'system:afed',
        action: payload.eventType.toUpperCase().replace(/\./g, '_'),
        entityType: 'FEDERATED_LEARNING',
        entityId: payload.modelId || 'afed_system',
        payload: {
          eventType: payload.eventType,
          roundNumber: payload.roundNumber,
          ...payload.details,
        },
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-blocking telemetry
    }
  }
}
