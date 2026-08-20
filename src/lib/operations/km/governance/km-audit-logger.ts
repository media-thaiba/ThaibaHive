import crypto from 'crypto';

export interface KmAuditEvent {
  eventId: string;
  eventType: 'query' | 'degree_audit' | 'intervention_triggered' | 'document_ingested';
  userId: string;
  institutionId: string;
  payloadHash: string;
  metadata: Record<string, any>;
  timestamp: string;
  previousHash: string;
  merkleHash: string;
}

export class KmAuditLogger {
  private static instance: KmAuditLogger;
  private auditChain: KmAuditEvent[] = [];
  private lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

  public static getInstance(): KmAuditLogger {
    if (!KmAuditLogger.instance) {
      KmAuditLogger.instance = new KmAuditLogger();
    }
    return KmAuditLogger.instance;
  }

  /**
   * Appends an immutable cryptographic record to the SHA-256 Merkle chain.
   */
  public logEvent(
    eventType: KmAuditEvent['eventType'],
    userId: string,
    payload: any,
    institutionId = 'global'
  ): KmAuditEvent {
    const eventId = `kmevt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toISOString();
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    const merkleHash = crypto
      .createHash('sha256')
      .update(`${eventId}:${eventType}:${userId}:${payloadHash}:${this.lastHash}:${timestamp}`)
      .digest('hex');

    const auditEvent: KmAuditEvent = {
      eventId,
      eventType,
      userId,
      institutionId,
      payloadHash,
      metadata: typeof payload === 'object' ? payload : { raw: payload },
      timestamp,
      previousHash: this.lastHash,
      merkleHash,
    };

    this.auditChain.push(auditEvent);
    this.lastHash = merkleHash;

    return auditEvent;
  }

  public verifyChainIntegrity(): boolean {
    let currentHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const evt of this.auditChain) {
      if (evt.previousHash !== currentHash) {
        return false;
      }
      const recalculated = crypto
        .createHash('sha256')
        .update(`${evt.eventId}:${evt.eventType}:${evt.userId}:${evt.payloadHash}:${evt.previousHash}:${evt.timestamp}`)
        .digest('hex');

      if (recalculated !== evt.merkleHash) {
        return false;
      }
      currentHash = evt.merkleHash;
    }

    return true;
  }

  public getChainLength(): number {
    return this.auditChain.length;
  }

  public clear(): void {
    this.auditChain.length = 0;
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }
}

export const kmAuditLogger = KmAuditLogger.getInstance();
