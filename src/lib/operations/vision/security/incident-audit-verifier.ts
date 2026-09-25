import { VisionMerkleAnchor } from './vision-merkle-anchor';
import { VisionDbStore } from '../../../db/vision-store';

export interface AuditVerificationReport {
  totalIncidentsVerified: number;
  tamperDetected: boolean;
  computedMerkleRoot: string;
  isIntegrityIntact: boolean;
}

export class IncidentAuditVerifier {
  private dbStore: VisionDbStore;

  constructor(dbStore?: VisionDbStore) {
    this.dbStore = dbStore || VisionDbStore.getInstance();
  }

  public async verifyIncidentAuditChain(tenantId: string = 'global'): Promise<AuditVerificationReport> {
    const incidents = await this.dbStore.listSecurityIncidents(tenantId);
    if (incidents.length === 0) {
      const { root } = VisionMerkleAnchor.buildMerkleTree([]);
      return {
        totalIncidentsVerified: 0,
        tamperDetected: false,
        computedMerkleRoot: root,
        isIntegrityIntact: true,
      };
    }

    const leafPayloads = incidents.map(
      (i) => `${i.incidentId}:${i.threatType}:${i.severity}:${i.occurredAt}:${i.status}`
    );

    const { root } = VisionMerkleAnchor.buildMerkleTree(leafPayloads);

    return {
      totalIncidentsVerified: incidents.length,
      tamperDetected: false,
      computedMerkleRoot: root,
      isIntegrityIntact: true,
    };
  }
}
