import { LineageEntityType, NeuroDatasetProvenanceItem, NeuroMerkleLineageNodeItem } from '../neuro-types';

export interface DatasetManifest {
  datasetId: string;
  name: string;
  version: string;
  files: Array<{
    path: string;
    sizeBytes: number;
    sha256: string;
  }>;
  totalSizeBytes: number;
  manifestSha256: string;
  rootMerkleHash: string;
}

export interface MerkleInclusionProof {
  leafHash: string;
  rootHash: string;
  proofSteps: Array<{
    position: 'left' | 'right';
    hash: string;
  }>;
  verified: boolean;
}

export interface W3CProvOMeta {
  id: string;
  type: 'prov:Entity' | 'prov:Activity' | 'prov:Agent';
  wasGeneratedBy?: string;
  used?: string[];
  wasAttributedTo?: string;
  generatedAtTime: string;
  attributes: Record<string, any>;
}

export interface ScientificReproducibilityPackage {
  manifestId: string;
  grantId?: string | null;
  dataset: NeuroDatasetProvenanceItem;
  lineageDAG: NeuroMerkleLineageNodeItem[];
  provOJsonLd: Record<string, any>;
  environmentDigest: {
    containerImage: string;
    cudaVersion: string;
    torchVersion: string;
    randomSeed: number;
  };
  merkleRootHash: string;
  complianceCertified: boolean;
  generatedAt: string;
}
