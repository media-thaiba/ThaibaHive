import { NeuroAuditLogItem } from '../neuro-types';
import { MerkleLineageDAG } from '../provenance/merkle-lineage-dag';

export class ComputeAuditVerifier {
  /**
   * Verifies the cryptographic consistency of an audit log chain.
   */
  public static verifyAuditChain(logs: NeuroAuditLogItem[]): {
    isValid: boolean;
    brokenIndex: number | null;
    verifiedRecordsCount: number;
  } {
    if (logs.length === 0) {
      return { isValid: true, brokenIndex: null, verifiedRecordsCount: 0 };
    }

    // Sort chronologically (oldest to newest)
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let currentPrevRoot = 'GENESIS_MERKLE_ROOT';

    for (let i = 0; i < sorted.length; i++) {
      const log = sorted[i];
      if (log.prevMerkleRoot !== currentPrevRoot) {
        return { isValid: false, brokenIndex: i, verifiedRecordsCount: i };
      }

      const expectedRoot = MerkleLineageDAG.computeSha256(`${log.prevMerkleRoot}:${log.payloadHash}`);
      if (expectedRoot !== log.merkleRoot) {
        return { isValid: false, brokenIndex: i, verifiedRecordsCount: i };
      }

      currentPrevRoot = log.merkleRoot;
    }

    return {
      isValid: true,
      brokenIndex: null,
      verifiedRecordsCount: sorted.length,
    };
  }
}
