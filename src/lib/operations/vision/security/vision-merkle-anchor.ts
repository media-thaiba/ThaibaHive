import * as crypto from 'crypto';

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export class VisionMerkleAnchor {
  public static hashLeaf(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public static buildMerkleTree(leaves: string[]): { root: string; leafHashes: string[] } {
    if (leaves.length === 0) {
      const emptyHash = this.hashLeaf('EMPTY_TREE');
      return { root: emptyHash, leafHashes: [emptyHash] };
    }

    let currentLevel = leaves.map((l) => this.hashLeaf(l));
    const leafHashes = [...currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combinedHash = crypto.createHash('sha256').update(left + right).digest('hex');
        nextLevel.push(combinedHash);
      }
      currentLevel = nextLevel;
    }

    return { root: currentLevel[0], leafHashes };
  }

  public static verifyProof(leaf: string, proof: string[], root: string): boolean {
    let currentHash = this.hashLeaf(leaf);
    for (const sibling of proof) {
      currentHash = crypto.createHash('sha256').update(currentHash + sibling).digest('hex');
    }
    return currentHash === root;
  }
}
