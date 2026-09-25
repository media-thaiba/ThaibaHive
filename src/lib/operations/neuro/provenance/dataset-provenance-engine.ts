import { NeuroDbStore, neuroStore } from '../../../db/neuro-store';
import { NeuroDatasetProvenanceItem, NeuroMerkleLineageNodeItem } from '../neuro-types';
import { MerkleLineageDAG } from './merkle-lineage-dag';
import { DatasetManifest } from './provenance-types';

export class DatasetProvenanceEngine {
  private store: NeuroDbStore;

  constructor(store: NeuroDbStore = neuroStore) {
    this.store = store;
  }

  /**
   * Registers a dataset with its file manifest and computes the initial Merkle DAG leaf.
   */
  public async registerDataset(
    manifest: DatasetManifest,
    grantId: string | null = null,
    tenantId: string = 'global'
  ): Promise<NeuroDatasetProvenanceItem> {
    const fileHashes = manifest.files.map((f) => f.sha256);
    const rootMerkleHash = MerkleLineageDAG.computeMerkleRoot(fileHashes);

    const dataset = await this.store.createDataset({
      datasetId: manifest.datasetId,
      name: manifest.name,
      version: manifest.version,
      sourceUri: `s3://neuro-datasets/${tenantId}/${manifest.datasetId}`,
      fileCount: manifest.files.length,
      totalSizeBytes: manifest.totalSizeBytes,
      manifestSha256: manifest.manifestSha256,
      rootMerkleHash,
      nsfNihGrantTagged: grantId,
      institutionId: tenantId,
    });

    // Create root DAG node
    await this.store.addLineageNode({
      nodeHash: rootMerkleHash,
      parentNodeHash: null,
      entityType: 'raw_dataset',
      entityId: dataset.id,
      datasetId: dataset.id,
      metadataJson: JSON.stringify({
        datasetName: manifest.name,
        fileCount: manifest.files.length,
        totalSizeBytes: manifest.totalSizeBytes,
      }),
      provOType: 'prov:Entity',
      timestamp: new Date().toISOString(),
      institutionId: tenantId,
    });

    return dataset;
  }

  /**
   * Links a training run execution (hyperparameters, container, code) to a parent dataset in the Merkle DAG.
   */
  public async recordTrainingExecution(
    jobId: string,
    datasetId: string,
    parentHash: string,
    hyperparameters: Record<string, any>,
    tenantId: string = 'global'
  ): Promise<NeuroMerkleLineageNodeItem> {
    const payload = {
      jobId,
      datasetId,
      parentHash,
      hyperparameters,
      timestamp: new Date().toISOString(),
    };
    const nodeHash = MerkleLineageDAG.computeSha256(payload);

    return await this.store.addLineageNode({
      nodeHash,
      parentNodeHash: parentHash,
      entityType: 'hyperparameters',
      entityId: jobId,
      jobId,
      datasetId,
      metadataJson: JSON.stringify(hyperparameters),
      provOType: 'prov:Activity',
      timestamp: new Date().toISOString(),
      institutionId: tenantId,
    });
  }

  /**
   * Seals a dataset, preventing further modifications and finalizing its Merkle lineage.
   */
  public async sealDataset(
    datasetId: string,
    sealedByUserId: string,
    tenantId: string = 'global'
  ): Promise<NeuroDatasetProvenanceItem | null> {
    const dataset = await this.store.getDatasetById(datasetId, tenantId);
    if (!dataset) return null;

    const updated = await this.store.createDataset({
      ...dataset,
      isSealed: true,
      sealedAt: new Date().toISOString(),
      sealedByUserId,
      institutionId: tenantId,
    });

    return updated;
  }
}
