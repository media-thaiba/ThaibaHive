/**
 * zk-SNARK Circuit Specification
 * Sprint-042 (ARES) — ARES-009
 */

import { ZkCircuitConstraint } from './zkp-types';

export const MERKLE_TREE_DEPTH = 20; // Supports 1,048,576 audit blocks per tree epoch

export const AUDIT_MEMBERSHIP_CIRCUIT_SPEC: ZkCircuitConstraint = {
  name: 'AuditLeafMembershipVerifier',
  r1csConstraintsCount: 2048,
  publicSignalCount: 2, // [merkleRoot, leafHashCommitment]
  privateSignalCount: MERKLE_TREE_DEPTH * 2 + 1, // [leafPreimage, pathElements..., pathIndices...]
};

export const CONTINUITY_CIRCUIT_SPEC: ZkCircuitConstraint = {
  name: 'MerkleSequentialContinuityVerifier',
  r1csConstraintsCount: 4096,
  publicSignalCount: 3, // [prevRoot, newRoot, epochTimestamp]
  privateSignalCount: 64,
};
