import { CurriculumAuditLogDto } from '../curriculum-types';
import { advisingMerkleAnchor } from './advising-merkle-anchor';

export class AuditTrailVerifier {
  /**
   * Verifies cryptographic integrity of an array of audit records
   */
  public verifyAuditLogIntegrity(logs: CurriculumAuditLogDto[]): { isIntegrityValid: boolean; verifiedRecordsCount: number; brokenRecords: string[] } {
    const brokenRecords: string[] = [];

    for (const log of logs) {
      const computedHash = advisingMerkleAnchor.hashRecord(log);
      if (log.merkleAuditHash && log.merkleAuditHash !== computedHash) {
        brokenRecords.push(log.auditId);
      }
    }

    return {
      isIntegrityValid: brokenRecords.length === 0,
      verifiedRecordsCount: logs.length - brokenRecords.length,
      brokenRecords,
    };
  }
}
