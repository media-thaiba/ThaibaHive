import * as crypto from 'crypto';
import { MerkleInclusionProof } from './provenance-types';

export class MerkleLineageDAG {
  /**
   * Computes a SHA-256 hash string for an arbitrary input payload.
   */
  public static computeSha256(payload: string | Record<string, any>): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Computes a binary Merkle tree root hash from an array of leaf hashes.
   */
  public static computeMerkleRoot(leafHashes: string[]): string {
    if (leafHashes.length === 0) {
      return MerkleLineageDAG.computeSha256('EMPTY_MERKLE_TREE');
    }
    if (leafHashes.length === 1) {
      return leafHashes[0];
    }

    let currentLayer = [...leafHashes];

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
        const combined = MerkleLineageDAG.computeSha256(`${left}:${right}`);
        nextLayer.push(combined);
      }
      currentLayer = nextLayer;
    }

    return currentLayer[0];
  }

  /**
   * Generates a Merkle inclusion proof for a specific leaf in the leaf array.
   */
  public static generateInclusionProof(leafHashes: string[], targetLeafHash: string): MerkleInclusionProof {
    const leafIndex = leafHashes.indexOf(targetLeafHash);
    const rootHash = MerkleLineageDAG.computeMerkleRoot(leafHashes);

    if (leafIndex === -1) {
      return {
        leafHash: targetLeafHash,
        rootHash,
        proofSteps: [],
        verified: false,
      };
    }

    const proofSteps: MerkleInclusionProof['proofSteps'] = [];
    let currentLayer = [...leafHashes];
    let currentIndex = leafIndex;

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
        const combined = MerkleLineageDAG.computeSha256(`${left}:${right}`);
        nextLayer.push(combined);

        if (i === currentIndex || i + 1 === currentIndex) {
          if (currentIndex % 2 === 0) {
            proofSteps.push({ position: 'right', hash: right });
          } else {
            proofSteps.push({ position: 'left', hash: left });
          }
        }
      }
      currentIndex = Math.floor(currentIndex / 2);
      currentLayer = nextLayer;
    }

    return {
      leafHash: targetLeafHash,
      rootHash,
      proofSteps,
      verified: true,
    };
  }

  /**
   * Verifies a Merkle inclusion proof against a known root hash.
   */
  public static verifyInclusionProof(proof: MerkleInclusionProof): boolean {
    let currentHash = proof.leafHash;

    for (const step of proof.proofSteps) {
      if (step.position === 'right') {
        currentHash = MerkleLineageDAG.computeSha256(`${currentHash}:${step.hash}`);
      } else {
        currentHash = MerkleLineageDAG.computeSha256(`${step.hash}:${currentHash}`);
      }
    }

    return currentHash === proof.rootHash;
  }
}
