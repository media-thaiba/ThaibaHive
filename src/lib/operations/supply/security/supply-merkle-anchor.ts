import { createHash } from 'crypto';
import { SupplyDbStore } from '../../../db/supply-store';
import { SupplyAuditLogItem, SupplyAuditAction } from '../supply-types';

export class SupplyMerkleAnchor {
  private store: SupplyDbStore;

  constructor(store: SupplyDbStore = SupplyDbStore.getInstance()) {
    this.store = store;
  }

  public static computeSha256(data: any): string {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    return createHash('sha256').update(raw).digest('hex');
  }

  public async anchorEvent(
    actorId: string,
    actorRole: string,
    action: SupplyAuditAction | string,
    entityType: string,
    entityId: string,
    payload: Record<string, any>,
    institutionId = 'global'
  ): Promise<SupplyAuditLogItem> {
    const existingLogs = await this.store.listAuditLogs(institutionId);
    const prevMerkleRoot = existingLogs.length > 0 ? existingLogs[0].merkleRoot : 'GENESIS_SUPPLY_MERKLE_ROOT';

    const payloadHash = SupplyMerkleAnchor.computeSha256(payload);
    const merkleRoot = SupplyMerkleAnchor.computeSha256(`${prevMerkleRoot}:${payloadHash}`);
    const auditId = `aud-supply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const logItem: SupplyAuditLogItem = {
      id: auditId,
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
      institutionId,
      createdAt: new Date().toISOString(),
    };

    return await this.store.createAuditLog(logItem);
  }
}
