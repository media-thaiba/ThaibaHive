export const AUDIT_ACTIONS = {
  DPOP_EVENT: 'DPOP_EVENT',
  SESSION_REVOCATION: 'SESSION_REVOCATION',
  RISK_STEPUP: 'RISK_STEPUP',
  DEVICE_FINGERPRINT: 'DEVICE_FINGERPRINT',
  IDENTITY_MIGRATION: 'IDENTITY_MIGRATION',
  IDENTITY_EVENT: 'IDENTITY_EVENT',
} as const;

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: any;
  previousHash?: string | null;
  currentHash: string;
  merkleRootId?: string | null;
  merkleProof?: string | null; // JSON string of MerkleProofStep[]
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
  createdAt?: string;
  nonce?: string;
}

export interface AuditMerkleRoot {
  id: string;
  tenantId: string;
  rootHash: string;
  startAuditId?: string | null;
  endAuditId?: string | null;
  leafCount: number;
  treeDepth: number;
  signature?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface MerkleProofStep {
  position: "left" | "right";
  hash: string;
}

export type MerkleProof = MerkleProofStep[];

export interface MerkleTreeResult {
  root: string;
  tree: string[][];
  depth: number;
  leafCount: number;
}

export interface AuditVerificationResult {
  valid: boolean;
  status: "VALID" | "CORRUPTED" | "INCOMPLETE";
  totalVerified: number;
  brokenIndex?: number;
  corruptedAuditId?: string;
  error?: string;
  durationMs: number;
  merkleRootsVerified: number;
}
