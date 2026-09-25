import { SupplyDbStore } from '../../../db/supply-store';
import { SupplyMerkleAnchor } from './supply-merkle-anchor';

export interface AuditVerificationReport {
  isValid: boolean;
  totalLogsScanned: number;
  unbrokenChain: boolean;
  tamperedLogId?: string;
  merkleHeadRoot: string;
  verifiedAt: string;
}

export class ProcurementAuditVerifier {
  public static async verifyChainIntegrity(
    institutionId = 'global',
    store: SupplyDbStore = SupplyDbStore.getInstance()
  ): Promise<AuditVerificationReport> {
    const logs = await store.listAuditLogs(institutionId);
    if (logs.length === 0) {
      return {
        isValid: true,
        totalLogsScanned: 0,
        unbrokenChain: true,
        merkleHeadRoot: 'EMPTY_CHAIN',
        verifiedAt: new Date().toISOString(),
      };
    }

    // Chronological order (oldest first)
    const chronologicalLogs = [...logs].reverse();
    let expectedPrevRoot = 'GENESIS_SUPPLY_MERKLE_ROOT';

    for (const log of chronologicalLogs) {
      if (log.prevMerkleRoot !== expectedPrevRoot) {
        return {
          isValid: false,
          totalLogsScanned: logs.length,
          unbrokenChain: false,
          tamperedLogId: log.auditId,
          merkleHeadRoot: logs[0].merkleRoot,
          verifiedAt: new Date().toISOString(),
        };
      }

      const recomputedRoot = SupplyMerkleAnchor.computeSha256(`${log.prevMerkleRoot}:${log.payloadHash}`);
      if (recomputedRoot !== log.merkleRoot) {
        return {
          isValid: false,
          totalLogsScanned: logs.length,
          unbrokenChain: false,
          tamperedLogId: log.auditId,
          merkleHeadRoot: logs[0].merkleRoot,
          verifiedAt: new Date().toISOString(),
        };
      }

      expectedPrevRoot = log.merkleRoot;
    }

    return {
      isValid: true,
      totalLogsScanned: logs.length,
      unbrokenChain: true,
      merkleHeadRoot: logs[0].merkleRoot,
      verifiedAt: new Date().toISOString(),
    };
  }
}
