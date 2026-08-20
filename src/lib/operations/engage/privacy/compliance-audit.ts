import { createHash } from 'crypto';
import { EngageDbStore } from '../../../db/engage-store';
import { cryptoAuditWriter } from '../../../audit/crypto-writer';

export interface MerkleAuditBlock {
  blockId: string;
  eventType: string;
  entityId: string;
  payloadHash: string;
  previousBlockHash: string;
  timestamp: string;
}

export class ComplianceAuditLogger {
  private static instance: ComplianceAuditLogger;
  private store: EngageDbStore;
  private lastBlockHash: string = '0000000000000000000000000000000000000000000000000000000000000000';
  private auditBlocks: MerkleAuditBlock[] = [];

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): ComplianceAuditLogger {
    if (!ComplianceAuditLogger.instance) {
      ComplianceAuditLogger.instance = new ComplianceAuditLogger();
    }
    return ComplianceAuditLogger.instance;
  }

  public logConsentMutation(
    recipientId: string,
    action: 'opt_in' | 'opt_out' | 'quiet_hours_update',
    details: Record<string, any>,
    institutionId = 'global'
  ): MerkleAuditBlock {
    const timestamp = new Date().toISOString();
    const payloadStr = JSON.stringify({ recipientId, action, details, institutionId, timestamp });
    const payloadHash = createHash('sha256').update(payloadStr).digest('hex');

    const blockHash = createHash('sha256')
      .update(`${this.lastBlockHash}:${payloadHash}:${timestamp}`)
      .digest('hex');

    const block: MerkleAuditBlock = {
      blockId: `blk_consent_${this.auditBlocks.length + 1}`,
      eventType: `CONSENT_${action.toUpperCase()}`,
      entityId: recipientId,
      payloadHash: blockHash,
      previousBlockHash: this.lastBlockHash,
      timestamp,
    };

    this.lastBlockHash = blockHash;
    this.auditBlocks.push(block);

    // Persist to central cryptographic audit vault (auditLogs and auditMerkleRoots tables)
    try {
      cryptoAuditWriter.log({
        tenantId: institutionId,
        action: `engage.consent.${action}`,
        entityType: 'engage_preferences',
        entityId: recipientId,
        payload: {
          action,
          details,
          merkleBlockHash: blockHash,
          previousBlockHash: block.previousBlockHash,
        },
        timestamp,
      }).catch(() => {});
    } catch {}

    return block;
  }

  public verifyChainIntegrity(): { isValid: boolean; blockCount: number } {
    let prev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const b of this.auditBlocks) {
      if (b.previousBlockHash !== prev) return { isValid: false, blockCount: this.auditBlocks.length };
      prev = b.payloadHash;
    }
    return { isValid: true, blockCount: this.auditBlocks.length };
  }

  public async exportDsarPackage(recipientId: string, institutionId = 'global'): Promise<Record<string, any>> {
    const preferences = await this.store.getPreferencesAsync(recipientId, institutionId);
    const messages = await this.store.listMessagesAsync(institutionId, 500);
    const recipientMessages = messages.filter((m) => m.recipientId === recipientId);

    return {
      recipientId,
      exportedAt: new Date().toISOString(),
      gdprLawfulBasis: 'GDPR Article 6(1)(e) - Educational Public Task & Explicit Consent',
      preferences: preferences || { status: 'default_opt_in' },
      communicationHistory: recipientMessages,
      auditBlocksRelated: this.auditBlocks.filter((b) => b.entityId === recipientId),
    };
  }
}
