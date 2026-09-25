import { createHash } from 'crypto';

export interface CarbonAuditEntry {
  auditId: string;
  eventType: string; // 'emission_recorded' | 'bess_dispatched' | 'offset_retired' | 'esg_report_published'
  actorId: string;
  facilityId?: string;
  payloadHash: string;
  previousHash: string;
  merkleLeaf: string;
  details: Record<string, any>;
  timestamp: string;
  institutionId: string;
}

export class CarbonMerkleAnchor {
  private static instance: CarbonMerkleAnchor;
  private auditChain: CarbonAuditEntry[] = [];
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  public static getInstance(): CarbonMerkleAnchor {
    if (!CarbonMerkleAnchor.instance) {
      CarbonMerkleAnchor.instance = new CarbonMerkleAnchor();
    }
    return CarbonMerkleAnchor.instance;
  }

  public clearChain(): void {
    this.auditChain = [];
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }

  public recordAuditBlock(
    eventType: string,
    actorId: string,
    details: Record<string, any>,
    institutionId: string = 'global',
    facilityId?: string
  ): CarbonAuditEntry {
    const rawPayload = JSON.stringify({ eventType, actorId, details, facilityId, institutionId });
    const payloadHash = createHash('sha256').update(rawPayload).digest('hex');

    const merkleLeaf = createHash('sha256')
      .update(this.lastHash + payloadHash)
      .digest('hex');

    const entry: CarbonAuditEntry = {
      auditId: `eco_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      actorId,
      facilityId,
      payloadHash,
      previousHash: this.lastHash,
      merkleLeaf,
      details,
      timestamp: new Date().toISOString(),
      institutionId,
    };

    this.lastHash = merkleLeaf;
    this.auditChain.push(entry);
    return entry;
  }

  public getAuditTrail(institutionId: string = 'global', limit: number = 50): CarbonAuditEntry[] {
    return this.auditChain
      .filter((e) => institutionId === 'global' || e.institutionId === institutionId)
      .slice(-limit);
  }

  public verifyChainIntegrity(): { isValid: boolean; checkedBlocks: number; brokenBlockIndex?: number } {
    let currentExpectedPrevious = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < this.auditChain.length; i++) {
      const block = this.auditChain[i];
      if (block.previousHash !== currentExpectedPrevious) {
        return { isValid: false, checkedBlocks: i, brokenBlockIndex: i };
      }

      const expectedLeaf = createHash('sha256')
        .update(block.previousHash + block.payloadHash)
        .digest('hex');

      if (expectedLeaf !== block.merkleLeaf) {
        return { isValid: false, checkedBlocks: i, brokenBlockIndex: i };
      }

      currentExpectedPrevious = block.merkleLeaf;
    }

    return { isValid: true, checkedBlocks: this.auditChain.length };
  }
}
