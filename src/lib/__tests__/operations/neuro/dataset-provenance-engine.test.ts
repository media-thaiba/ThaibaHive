import { NeuroDbStore } from '../../../db/neuro-store';
import { DatasetProvenanceEngine } from '../../../operations/neuro/provenance/dataset-provenance-engine';
import { MerkleLineageDAG } from '../../../operations/neuro/provenance/merkle-lineage-dag';

describe('DatasetProvenanceEngine & MerkleLineageDAG (NEURO-008)', () => {
  let store: NeuroDbStore;
  let engine: DatasetProvenanceEngine;

  beforeEach(() => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
    engine = new DatasetProvenanceEngine(store);
  });

  it('should compute deterministic Merkle roots and verify inclusion proofs', () => {
    const leafHashes = [
      'hash_shard_001_abc',
      'hash_shard_002_def',
      'hash_shard_003_ghi',
      'hash_shard_004_jkl',
    ];

    const root = MerkleLineageDAG.computeMerkleRoot(leafHashes);
    expect(root).toBeDefined();
    expect(root.length).toBe(64); // SHA-256 hex length

    const proof = MerkleLineageDAG.generateInclusionProof(leafHashes, 'hash_shard_002_def');
    expect(proof.verified).toBe(true);
    expect(proof.proofSteps.length).toBeGreaterThan(0);

    const isVerified = MerkleLineageDAG.verifyInclusionProof(proof);
    expect(isVerified).toBe(true);
  });

  it('should register datasets, record training lineage, and seal provenance records', async () => {
    const dataset = await engine.registerDataset(
      {
        datasetId: 'DATASET-PROTEIN-FOLD-V1',
        name: 'Human Proteome 3D Conformations',
        version: '1.0.0',
        files: [
          { path: 'shard_001.h5', sizeBytes: 1024 * 1024 * 500, sha256: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890' },
          { path: 'shard_002.h5', sizeBytes: 1024 * 1024 * 500, sha256: 'b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1' },
        ],
        totalSizeBytes: 1024 * 1024 * 1000,
        manifestSha256: 'c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2',
        rootMerkleHash: '',
      },
      'NSF-GRANT-9988',
      'inst_01'
    );

    expect(dataset.id).toBeDefined();
    expect(dataset.rootMerkleHash).toBeDefined();

    const lineageNode = await engine.recordTrainingExecution(
      'JOB-FOLD-ALPHA',
      dataset.id,
      dataset.rootMerkleHash,
      { learningRate: 0.0001, batchSize: 64, optimizer: 'AdamW' },
      'inst_01'
    );

    expect(lineageNode.parentNodeHash).toBe(dataset.rootMerkleHash);
    expect(lineageNode.entityType).toBe('hyperparameters');

    const sealed = await engine.sealDataset(dataset.datasetId, 'staff_lead_pi', 'inst_01');
    expect(sealed?.isSealed).toBe(true);
    expect(sealed?.sealedAt).toBeDefined();
  });
});
