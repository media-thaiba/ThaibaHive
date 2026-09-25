import { facilityMerkleAnchor } from './facility-merkle-anchor';
import { FacilityAuditLogItem } from '../facility-types';

export class AuditTrailVerifier {
  public static verifyLogChain(logs: FacilityAuditLogItem[]): { valid: boolean; totalVerified: number; brokenIndex?: number } {
    if (logs.length === 0) return { valid: true, totalVerified: 0 };

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const leafHash = facilityMerkleAnchor.hashRecord(log);

      if (!leafHash) {
        return { valid: false, totalVerified: i, brokenIndex: i };
      }
    }

    return { valid: true, totalVerified: logs.length };
  }
}
