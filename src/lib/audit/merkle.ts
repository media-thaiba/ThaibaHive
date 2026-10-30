import crypto from "crypto";

export interface MerkleProofStep {
  sibling: string; // 64-char hex
  position: "left" | "right";
}

export interface MerkleProof {
  targetHash: string; // 64-char hex (original leaf hash before 0x00 prefix)
  leafHash: string;   // 64-char hex (SHA256(0x00 || targetHash))
  root: string;       // 64-char hex
  steps: MerkleProofStep[];
}

/**
 * RFC 6962 Domain-Separated Leaf Hash:
 * H_leaf(hash) = SHA-256(Buffer.concat([Buffer.from([0x00]), Buffer.from(hash, "hex")]))
 */
export function hashLeaf(currentHashHex: string): string {
  const buf = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(currentHashHex, "hex"),
  ]);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * RFC 6962 Domain-Separated Internal Node Hash:
 * H_node(left, right) = SHA-256(Buffer.concat([Buffer.from([0x01]), Buffer.from(left, "hex"), Buffer.from(right, "hex")]))
 */
export function hashNode(leftHex: string, rightHex: string): string {
  const buf = Buffer.concat([
    Buffer.from([0x01]),
    Buffer.from(leftHex, "hex"),
    Buffer.from(rightHex, "hex"),
  ]);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Computes the RFC 6962 domain-separated Merkle root from an array of audit record currentHashes.
 * If leaf count is odd, the final unpaired node is promoted to the next tree level.
 */
export function computeMerkleRoot(hashes: string[]): string {
  if (!hashes || hashes.length === 0) {
    return crypto.createHash("sha256").update("").digest("hex");
  }

  // Convert raw audit currentHashes into RFC 6962 domain-separated leaves
  let currentLevel = hashes.map(hashLeaf);

  if (currentLevel.length === 1) {
    return currentLevel[0];
  }

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashNode(currentLevel[i], currentLevel[i + 1]));
      } else {
        // Unpaired odd node: promote directly to next level
        nextLevel.push(currentLevel[i]);
      }
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

/**
 * Generates an RFC 6962 domain-separated Merkle inclusion proof for a target leaf hash.
 * Guardrail 3: Each proof step includes position ("left" | "right") so verification
 * accurately preserves non-commutative node ordering.
 */
export function generateMerkleProof(targetHash: string, leaves: string[]): MerkleProof {
  if (!leaves || leaves.length === 0) {
    throw new Error("Cannot generate Merkle proof for empty leaves");
  }

  const targetIndex = leaves.indexOf(targetHash);
  if (targetIndex === -1) {
    throw new Error(`Target hash ${targetHash} not found in provided leaves`);
  }

  const targetLeafHash = hashLeaf(targetHash);

  // If only 1 leaf, root is the leaf hash itself with empty steps
  if (leaves.length === 1) {
    return {
      targetHash,
      leafHash: targetLeafHash,
      root: targetLeafHash,
      steps: [],
    };
  }

  let currentLevel = leaves.map(hashLeaf);
  let currentIndex = targetIndex;
  const steps: MerkleProofStep[] = [];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    // If current index is odd, sibling is left (currentIndex - 1)
    // If current index is even, sibling is right (currentIndex + 1)
    if (currentIndex % 2 === 1) {
      steps.push({
        sibling: currentLevel[currentIndex - 1],
        position: "left",
      });
    } else if (currentIndex + 1 < currentLevel.length) {
      steps.push({
        sibling: currentLevel[currentIndex + 1],
        position: "right",
      });
    }
    // If currentIndex is even and at the end of an odd-length level, it is promoted unpaired (no sibling added)

    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashNode(currentLevel[i], currentLevel[i + 1]));
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }

    currentIndex = Math.floor(currentIndex / 2);
    currentLevel = nextLevel;
  }

  return {
    targetHash,
    leafHash: targetLeafHash,
    root: currentLevel[0],
    steps,
  };
}

/**
 * Verifies an RFC 6962 domain-separated Merkle proof in constant time using crypto.timingSafeEqual.
 */
export function verifyMerkleProof(proof: MerkleProof): boolean {
  if (!proof || !proof.targetHash || !proof.root) {
    return false;
  }

  let current = hashLeaf(proof.targetHash);

  // If leafHash in proof is specified, assert consistency with computed leaf hash
  if (proof.leafHash && proof.leafHash !== current) {
    return false;
  }

  for (const step of proof.steps) {
    if (!step.sibling || step.sibling.length !== 64) {
      return false;
    }
    if (step.position === "left") {
      current = hashNode(step.sibling, current);
    } else if (step.position === "right") {
      current = hashNode(current, step.sibling);
    } else {
      return false;
    }
  }

  const bufCurrent = Buffer.from(current, "hex");
  const bufRoot = Buffer.from(proof.root, "hex");

  if (bufCurrent.length !== bufRoot.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufCurrent, bufRoot);
}
