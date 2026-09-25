import { NeuroDbStore } from '../../../db/neuro-store';
import { DatasetProvenanceEngine } from '../../../operations/neuro/provenance/dataset-provenance-engine';
import { ReproducibilityExporter } from '../../../operations/neuro/provenance/reproducibility-exporter';
import { GrantAuditVerifier } from '../../../operations/neuro/provenance/grant-audit-verifier';

describe('ReproducibilityExporter & GrantAuditVerifier (NEURO-009)', () => {
  let store: NeuroDbStore;
  let provEngine: DatasetProvenanceEngine;
  let exporter: ReproducibilityExporter;

  beforeEach(async () => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
    provEngine = new DatasetProvenanceEngine(store);
    exporter = new ReproducibilityExporter(store);

    const dataset = await provEngine.registerDataset(
      {
        datasetId: 'DATASET-CLINICAL-NLP',
        name: 'Clinical EHR De-identified Notes',
        version: '2.1.0',
        files: [{ path: 'ehr.parquet', sizeBytes: 50000000, sha256: 'deadbeef12345678deadbeef12345678deadbeef12345678deadbeef12345678' }],
        totalSizeBytes: 50000000,
        manifestSha256: 'manifestdeadbeef12345678deadbeef12345678deadbeef12345678deadbeef',
        rootMerkleHash: '',
      },
      'NIH-R01-LM012345',
      'inst_01'
    );

    await provEngine.recordTrainingExecution(
      'JOB-MED-BIOBERT',
      dataset.id,
      dataset.rootMerkleHash,
      { maxSeqLen: 512, hiddenDim: 768 },
      'inst_01'
    );
  });

  it('should export W3C PROV-O compliance dossier and pass NSF/NIH grant verification', async () => {
    const dataset = (await store.listDatasets('inst_01'))[0];

    const dossier = await exporter.exportDossier(dataset.datasetId, 'NIH-R01-LM012345', 'inst_01');

    expect(dossier).not.toBeNull();
    expect(dossier?.complianceCertified).toBe(true);
    expect(dossier?.provOJsonLd['@graph'].length).toBeGreaterThan(0);

    if (dossier) {
      const verification = GrantAuditVerifier.verifyPackage(dossier);
      expect(verification.isValid).toBe(true);
      expect(verification.reproducibilityScore).toBe(100.0);
      expect(verification.auditFindings.length).toBe(0);
    }
  });
});
