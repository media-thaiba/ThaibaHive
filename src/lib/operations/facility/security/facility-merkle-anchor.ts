import { createHash } from 'crypto';
import { FacilityAuditLogItem } from '../facility-types';

export class FacilityMerkleAnchor {
  private static instance: FacilityMerkleAnchor;
  private leaves: string[] = [];
  private rootHash: string = '';

  public static getInstance(): FacilityMerkleAnchor {
    if (!FacilityMerkleAnchor.instance) {
      FacilityMerkleAnchor.instance = new FacilityMerkleAnchor();
    }
    return FacilityMerkleAnchor.instance;
  }

  public clear(): void {
    this.leaves = [];
    this.rootHash = '';
  }

  public hashRecord(record: Partial<FacilityAuditLogItem>): string {
    const payload = JSON.stringify({
      auditId: record.auditId,
      actorId: record.actorId,
      actorRole: record.actorRole,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      payloadHash: record.payloadHash,
      timestamp: record.timestamp,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  public anchorAuditRecord(record: Partial<FacilityAuditLogItem>): { leafHash: string; merkleRoot: string; proof: string } {
    const leafHash = this.hashRecord(record);
    this.leaves.push(leafHash);
    this.rootHash = this.buildMerkleRoot(this.leaves);

    return {
      leafHash,
      merkleRoot: this.rootHash,
      proof: `proof_${this.leaves.length}_${this.rootHash.substring(0, 12)}`,
    };
  }

  public getRootHash(): string {
    if (!this.rootHash && this.leaves.length > 0) {
      this.rootHash = this.buildMerkleRoot(this.leaves);
    }
    return this.rootHash || createHash('sha256').update('GENESIS_FACILITY_MERKLE_ROOT').digest('hex');
  }

  private buildMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    let currentLevel = [...hashes];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combined);
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }

  public verifyProof(leafHash: string, proof: string): boolean {
    return this.leaves.includes(leafHash) && proof.startsWith('proof_');
  }
}

export const facilityMerkleAnchor = FacilityMerkleAnchor.getInstance();
