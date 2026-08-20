import { createHash } from 'crypto';

export interface TwinAuditEntry {
  auditId: string;
  eventType: string;
  actorId: string;
  facilityId?: string;
  payloadHash: string;
  previousHash: string;
  details: Record<string, any>;
  timestamp: string;
  institutionId: string;
}

export class TwinAuditLogger {
  private static instance: TwinAuditLogger;
  private auditChain: TwinAuditEntry[] = [];
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  public static getInstance(): TwinAuditLogger {
    if (!TwinAuditLogger.instance) {
      TwinAuditLogger.instance = new TwinAuditLogger();
    }
    return TwinAuditLogger.instance;
  }

  public logEvent(
    eventType: string,
    actorId: string,
    details: Record<string, any>,
    institutionId: string = 'global',
    facilityId?: string
  ): TwinAuditEntry {
    const rawPayload = JSON.stringify({ eventType, actorId, details, facilityId, institutionId });
    const payloadHash = createHash('sha256').update(rawPayload).digest('hex');

    const entryHash = createHash('sha256')
      .update(this.lastHash + payloadHash)
      .digest('hex');

    const entry: TwinAuditEntry = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      actorId,
      facilityId,
      payloadHash,
      previousHash: this.lastHash,
      details,
      timestamp: new Date().toISOString(),
      institutionId,
    };

    this.lastHash = entryHash;
    this.auditChain.push(entry);
    return entry;
  }

  public getAuditTrail(institutionId: string = 'global', limit: number = 50): TwinAuditEntry[] {
    return this.auditChain
      .filter((e) => institutionId === 'global' || e.institutionId === institutionId)
      .slice(-limit);
  }

  public verifyChainIntegrity(): boolean {
    let currentHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const entry of this.auditChain) {
      if (entry.previousHash !== currentHash) return false;
      const rawPayload = JSON.stringify({
        eventType: entry.eventType,
        actorId: entry.actorId,
        details: entry.details,
        facilityId: entry.facilityId,
        institutionId: entry.institutionId,
      });
      const payloadHash = createHash('sha256').update(rawPayload).digest('hex');
      if (payloadHash !== entry.payloadHash) return false;
      currentHash = createHash('sha256').update(currentHash + payloadHash).digest('hex');
    }
    return true;
  }

  public clear(): void {
    this.auditChain = [];
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }
}
