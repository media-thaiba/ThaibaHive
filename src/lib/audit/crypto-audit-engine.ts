import crypto from "crypto";
import { AuditEntry, MerkleProof, MerkleTreeResult, AuditVerificationResult } from "./types";

export const GENESIS_PREV_HASH = "0".repeat(64);

/**
 * Deterministically serializes and hashes an arbitrary payload object using SHA-256
 */
export function computePayloadHash(payload: any): string {
  if (payload === undefined || payload === null) {
    return crypto.createHash("sha256").update("").digest("hex");
  }

  // Canonicalize keys recursively for deterministic JSON serialization
  const canonicalize = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(canonicalize);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = canonicalize(obj[key]);
    }
    return result;
  };

  const canonicalJson = JSON.stringify(canonicalize(payload));
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

/**
 * Computes the SHA-256 block hash for an individual audit log entry
 */
export function computeAuditBlockHash(params: {
  previousHash: string;
  timestamp: string;
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payloadHash: string;
  nonce?: string;
}): string {
  const normalizedPrev = params.previousHash || GENESIS_PREV_HASH;
  const raw = [
    normalizedPrev,
    params.timestamp,
    params.tenantId,
    params.userId || "",
    params.action,
    params.entityType,
    params.entityId || "",
    params.payloadHash,
    params.nonce || "0",
  ].join("|");

  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Combines two SHA-256 child hashes to form parent hash in Merkle Tree
 */
export function hashPair(left: string, right: string): string {
  return crypto.createHash("sha256").update(left + right, "utf8").digest("hex");
}

/**
 * Builds a binary Merkle tree from an array of leaf hashes
 */
export function buildMerkleTree(leafHashes: string[]): MerkleTreeResult {
  if (!leafHashes || leafHashes.length === 0) {
    const emptyRoot = crypto.createHash("sha256").update("").digest("hex");
    return { root: emptyRoot, tree: [[emptyRoot]], depth: 1, leafCount: 0 };
  }

  const tree: string[][] = [];
  let currentLevel = [...leafHashes];
  tree.push(currentLevel);

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : currentLevel[i]; // duplicate odd leaf
      nextLevel.push(hashPair(left, right));
    }
    tree.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    root: currentLevel[0],
    tree,
    depth: tree.length,
    leafCount: leafHashes.length,
  };
}

/**
 * Generates Merkle inclusion proof for a leaf at given index
 */
export function generateMerkleProof(tree: string[][], leafIndex: number): MerkleProof {
  const proof: MerkleProof = [];
  let index = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const levelNodes = tree[level];
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;

    if (siblingIndex < levelNodes.length) {
      proof.push({
        position: isRightNode ? "left" : "right",
        hash: levelNodes[siblingIndex],
      });
    } else {
      // Odd node paired with itself
      proof.push({
        position: "right",
        hash: levelNodes[index],
      });
    }

    index = Math.floor(index / 2);
  }

  return proof;
}

/**
 * Verifies a Merkle inclusion proof against an expected root hash
 */
export function verifyMerkleProof(leafHash: string, proof: MerkleProof, expectedRoot: string): boolean {
  let computedHash = leafHash;

  for (const step of proof) {
    if (step.position === "left") {
      computedHash = hashPair(step.hash, computedHash);
    } else {
      computedHash = hashPair(computedHash, step.hash);
    }
  }

  return computedHash === expectedRoot;
}

/**
 * Verifies a chronological sequence of audit log entries for cryptographic hash-chain integrity
 */
export function verifyAuditChain(entries: AuditEntry[]): AuditVerificationResult {
  const startTime = Date.now();

  if (!entries || entries.length === 0) {
    return {
      valid: true,
      status: "VALID",
      totalVerified: 0,
      durationMs: Date.now() - startTime,
      merkleRootsVerified: 0,
    };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrev = i === 0 ? (entry.previousHash || GENESIS_PREV_HASH) : entries[i - 1].currentHash;

    if (entry.previousHash && entry.previousHash !== expectedPrev) {
      return {
        valid: false,
        status: "CORRUPTED",
        totalVerified: i,
        brokenIndex: i,
        corruptedAuditId: entry.id,
        error: `Broken hash chain at index ${i} (ID: ${entry.id}). Expected previousHash ${expectedPrev}, found ${entry.previousHash}`,
        durationMs: Date.now() - startTime,
        merkleRootsVerified: 0,
      };
    }

    const payloadHash = typeof entry.payload === "string" 
      ? (entry.payload.startsWith("{") || entry.payload.startsWith("[") 
          ? computePayloadHash(JSON.parse(entry.payload)) 
          : computePayloadHash(entry.payload))
      : computePayloadHash(entry.payload);

    const recomputedHash = computeAuditBlockHash({
      previousHash: expectedPrev,
      timestamp: entry.timestamp,
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      payloadHash,
      nonce: entry.nonce || "0",
    });

    if (recomputedHash !== entry.currentHash) {
      return {
        valid: false,
        status: "CORRUPTED",
        totalVerified: i,
        brokenIndex: i,
        corruptedAuditId: entry.id,
        error: `Invalid currentHash at index ${i} (ID: ${entry.id}). Recomputed ${recomputedHash} !== recorded ${entry.currentHash}`,
        durationMs: Date.now() - startTime,
        merkleRootsVerified: 0,
      };
    }
  }

  return {
    valid: true,
    status: "VALID",
    totalVerified: entries.length,
    durationMs: Date.now() - startTime,
    merkleRootsVerified: 0,
  };
}
