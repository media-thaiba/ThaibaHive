import { NeuroDbStore } from '../../../db/neuro-store';
import { NeuroMerkleAnchor } from '../../../operations/neuro/security/neuro-merkle-anchor';
import { ComputeAuditVerifier } from '../../../operations/neuro/security/compute-audit-verifier';

describe('NeuroMerkleAnchor & ComputeAuditVerifier (NEURO-014)', () => {
  let store: NeuroDbStore;
  let anchor: NeuroMerkleAnchor;

  beforeEach(() => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
    anchor = new NeuroMerkleAnchor(store);
  });

  it('should anchor operational events into an immutable Merkle chain and verify integrity', async () => {
    await anchor.anchorEvent(
      'staff_prof_chen',
      'principal_investigator',
      'cluster_registered',
      'neuro_cluster',
      'cluster_titan_01',
      { clusterName: 'Titan Cluster', totalGpus: 128 },
      'inst_01'
    );

    await anchor.anchorEvent(
      'staff_prof_chen',
      'principal_investigator',
      'job_submitted',
      'neuro_job',
      'job_llm_70b',
      { requestedGpus: 8, priority: 'urgent' },
      'inst_01'
    );

    await anchor.anchorEvent(
      'system_arbitrage_agent',
      'system',
      'spot_arbitrage_burst',
      'neuro_node',
      'node_aws_spot_01',
      { provider: 'aws', spotPrice: 24.50 },
      'inst_01'
    );

    const logs = await store.listAuditLogs(undefined, 'inst_01');
    expect(logs.length).toBe(3);

    const verification = ComputeAuditVerifier.verifyAuditChain(logs);
    expect(verification.isValid).toBe(true);
    expect(verification.verifiedRecordsCount).toBe(3);
    expect(verification.brokenIndex).toBeNull();
  });
});
