import { createHash } from 'crypto';
import { cryptoAuditWriter } from '@/lib/audit/crypto-writer';

export type AimsAuditEventType =
  | 'AIMS_MARL_ACTION_DISPATCHED'
  | 'AIMS_ENERGY_OPTIMIZED'
  | 'AIMS_FLEET_DISPATCHED'
  | 'AIMS_VEHICLE_MAINTENANCE_LOGGED'
  | 'AIMS_BIOMETRIC_ATTENDANCE_VERIFIED'
  | 'AIMS_CLOUD_RIGHTSIZED'
  | 'AIMS_CARBON_RECORDED'
  | 'AIMS_RESOURCE_ALLOCATED'
  | 'AIMS_KILL_SWITCH_TRIGGERED';

export interface AimsAuditBlock {
  blockId: string;
  eventType: AimsAuditEventType;
  actorId: string;
  campusId: string;
  institutionId: string;
  payloadHash: string;
  metadata: Record<string, any>;
  timestamp: string;
  prevBlockHash: string;
  currentBlockHash: string;
}

/**
 * Cryptographic Merkle Audit Trail Integrator for AIMS Operational Events
 * Persists blocks to in-memory verification chain and persistent cryptoAuditWriter database.
 */
export class AimsAuditTrail {
  private lastBlockHash = '0000000000000000000000000000000000000000000000000000000000000000';
  private blocks: AimsAuditBlock[] = [];

  public emitEvent(
    eventType: AimsAuditEventType,
    actorId: string,
    campusId: string,
    institutionId: string,
    metadata: Record<string, any>
  ): AimsAuditBlock {
    // Redact any raw biometric embedding vectors or secret credentials
    const cleanMeta = { ...metadata };
    delete cleanMeta.queryEmbedding;
    delete cleanMeta.vector;
    delete cleanMeta.secretKey;

    const payloadString = JSON.stringify(cleanMeta);
    const payloadHash = createHash('sha256').update(payloadString).digest('hex');
    const timestamp = new Date().toISOString();

    const blockHeader = `${eventType}:${actorId}:${campusId}:${institutionId}:${payloadHash}:${timestamp}:${this.lastBlockHash}`;
    const currentBlockHash = createHash('sha256').update(blockHeader).digest('hex');

    const block: AimsAuditBlock = {
      blockId: `aims_blk_${currentBlockHash.substring(0, 16)}`,
      eventType,
      actorId,
      campusId,
      institutionId,
      payloadHash,
      metadata: cleanMeta,
      timestamp,
      prevBlockHash: this.lastBlockHash,
      currentBlockHash,
    };

    this.lastBlockHash = currentBlockHash;
    this.blocks.push(block);

    // Bridge to cryptoAuditWriter for compliance:verify persistence
    cryptoAuditWriter
      .log({
        tenantId: institutionId || 'global',
        userId: actorId || 'system:aims',
        action: eventType,
        entityType: 'AIMS_SMART_CAMPUS',
        entityId: campusId || 'campus_main',
        payload: {
          blockId: block.blockId,
          eventType,
          payloadHash,
          currentBlockHash,
          metadata: cleanMeta,
        },
      })
      .catch((err) => {
        console.warn('[@thaiba/aims-audit] Failed to write persistent audit log:', err);
      });

    return block;
  }

  public verifyChainIntegrity(): boolean {
    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const blk of this.blocks) {
      if (blk.prevBlockHash !== expectedPrev) return false;
      const blockHeader = `${blk.eventType}:${blk.actorId}:${blk.campusId}:${blk.institutionId}:${blk.payloadHash}:${blk.timestamp}:${blk.prevBlockHash}`;
      const hash = createHash('sha256').update(blockHeader).digest('hex');
      if (hash !== blk.currentBlockHash) return false;
      expectedPrev = blk.currentBlockHash;
    }
    return true;
  }

  public getBlockCount(): number {
    return this.blocks.length;
  }
}
