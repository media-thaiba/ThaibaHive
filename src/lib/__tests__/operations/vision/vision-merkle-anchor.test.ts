import { VisionMerkleAnchor } from '../../../operations/vision/security/vision-merkle-anchor';
import { IncidentAuditVerifier } from '../../../operations/vision/security/incident-audit-verifier';
import { VisionDbStore } from '../../../db/vision-store';

describe('VisionMerkleAnchor & IncidentAuditVerifier Cryptographic Integrity', () => {
  let store: VisionDbStore;
  let verifier: IncidentAuditVerifier;

  beforeEach(() => {
    store = VisionDbStore.getInstance();
    store.clearMemoryStore();
    verifier = new IncidentAuditVerifier(store);
  });

  it('should compute deterministic Merkle roots for security incidents', () => {
    const leaves = [
      'inc_01:perimeter_intrusion:critical:2026-08-21T00:00:00Z:open',
      'inc_02:stampede_risk:high:2026-08-21T01:00:00Z:contained',
      'inc_03:blacklisted_vehicle:critical:2026-08-21T02:00:00Z:resolved',
    ];

    const { root, leafHashes } = VisionMerkleAnchor.buildMerkleTree(leaves);
    expect(root.length).toBe(64); // SHA-256
    expect(leafHashes.length).toBe(3);

    // Tree recomputation must match exactly
    const recomputed = VisionMerkleAnchor.buildMerkleTree(leaves);
    expect(recomputed.root).toBe(root);
  });

  it('should verify incident audit chain integrity via IncidentAuditVerifier', async () => {
    await store.createSecurityIncident({
      incidentId: 'inc_test_100',
      title: 'Perimeter Alert',
      threatType: 'perimeter_intrusion',
      severity: 'high',
      facilityId: 'fac_main',
      status: 'open',
      occurredAt: new Date().toISOString(),
      institutionId: 'tenant_alpha',
    });

    const report = await verifier.verifyIncidentAuditChain('tenant_alpha');
    expect(report.totalIncidentsVerified).toBe(1);
    expect(report.isIntegrityIntact).toBe(true);
    expect(report.tamperDetected).toBe(false);
    expect(report.computedMerkleRoot.length).toBe(64);
  });
});
