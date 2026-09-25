import { NeuroDbStore, neuroStore } from '../../../db/neuro-store';
import { MerkleLineageDAG } from '../provenance/merkle-lineage-dag';
import { NeuroAuditLogItem } from '../neuro-types';

export class NeuroMerkleAnchor {
  private store: NeuroDbStore;

  constructor(store: NeuroDbStore = neuroStore) {
    this.store = store;
  }

  /**
   * Anchors an operational event into the continuous SHA-256 Merkle audit chain.
   */
  public async anchorEvent(
    actorId: string,
    actorRole: string,
    action: string,
    entityType: string,
    entityId: string,
    payload: Record<string, any>,
    tenantId: string = 'global'
  ): Promise<NeuroAuditLogItem> {
    const existingLogs = await this.store.listAuditLogs(undefined, tenantId);
    const prevMerkleRoot = existingLogs.length > 0 ? existingLogs[0].merkleRoot : 'GENESIS_MERKLE_ROOT';

    const payloadHash = MerkleLineageDAG.computeSha256(payload);
    const merkleRoot = MerkleLineageDAG.computeSha256(`${prevMerkleRoot}:${payloadHash}`);

    const auditId = `AUD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return await this.store.appendAuditLog({
      auditId,
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      payloadHash,
      prevMerkleRoot,
      merkleRoot,
      timestamp: new Date().toISOString(),
      institutionId: tenantId,
    });
  }
}
