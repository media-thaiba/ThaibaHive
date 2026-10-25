import crypto from "crypto";
import { db } from "@/db";
import { auditLogs } from "@thaiba/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import {
  canonicalizePayload,
  computePreimageString,
  verifyAuditHmacSignature,
  GENESIS_PREV_HASH,
} from "./canonical";
import { computeMerkleRoot } from "./merkle";

export type AuditErrorReason =
  | "SEQUENCE_GAP"
  | "PREVIOUS_HASH_BROKEN"
  | "HASH_MISMATCH"
  | "SIGNATURE_INVALID";

export interface AuditVerificationResult {
  valid: boolean;
  checkedCount: number;
  merkleRoot: string;
  firstCorruptedSequence?: number;
  errorReason?: AuditErrorReason;
}

/**
 * Mathematically verifies an audit hash-chain for a tenant with strict anchor and continuity guarantees.
 * Guardrail 2:
 * - If fromSeq <= 1 or omitted, expectedSeq starts at 1 and expectedPrevHash at 64 zeros.
 *   If record #1 was deleted, rows[0].sequenceNumber !== 1 immediately flags SEQUENCE_GAP at #1.
 * - If fromSeq > 1, fetches the anchor row at fromSeq - 1 (or verifies rows[0].sequenceNumber === fromSeq)
 *   so boundary deletions at the start of a window are never missed.
 */
export async function verifyAuditChainIntegrity(
  tenantId: string,
  fromSeq?: number,
  toSeq?: number,
  dbInstance: any = db
): Promise<AuditVerificationResult> {
  const startSeq = fromSeq && fromSeq > 0 ? fromSeq : 1;

  // 1. Resolve starting anchor previousHash
  let expectedPrevHash = GENESIS_PREV_HASH;
  if (startSeq > 1) {
    const anchorQuery = dbInstance
      .select({ sequenceNumber: auditLogs.sequenceNumber, currentHash: auditLogs.currentHash })
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.sequenceNumber, startSeq - 1)))
      .limit(1);

    const anchorRows = await (anchorQuery.all ? anchorQuery.all() : anchorQuery);
    if (!anchorRows || anchorRows.length === 0) {
      return {
        valid: false,
        checkedCount: 0,
        merkleRoot: "",
        firstCorruptedSequence: startSeq - 1,
        errorReason: "SEQUENCE_GAP",
      };
    }
    expectedPrevHash = anchorRows[0].currentHash;
  }

  // 2. Query target window rows
  const conditions = [
    eq(auditLogs.tenantId, tenantId),
    gte(auditLogs.sequenceNumber, startSeq),
  ];
  if (toSeq && toSeq >= startSeq) {
    conditions.push(lte(auditLogs.sequenceNumber, toSeq));
  }

  const query = dbInstance
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(asc(auditLogs.sequenceNumber));

  const rows = await (query.all ? query.all() : query);

  if (!rows || rows.length === 0) {
    return {
      valid: true,
      checkedCount: 0,
      merkleRoot: "",
    };
  }

  // Check if first returned row matches startSeq (detects deletion of row #1 or startSeq boundary)
  if (rows[0].sequenceNumber !== startSeq) {
    return {
      valid: false,
      checkedCount: 0,
      merkleRoot: "",
      firstCorruptedSequence: startSeq,
      errorReason: "SEQUENCE_GAP",
    };
  }

  let expectedSeq = startSeq;
  const leafHashes: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // A. Contiguous Sequence Gap Check
    if (row.sequenceNumber !== expectedSeq) {
      return {
        valid: false,
        checkedCount: i,
        merkleRoot: leafHashes.length > 0 ? computeMerkleRoot(leafHashes) : "",
        firstCorruptedSequence: expectedSeq,
        errorReason: "SEQUENCE_GAP",
      };
    }

    // B. Previous Hash Chaining Check
    if (row.previousHash !== expectedPrevHash) {
      return {
        valid: false,
        checkedCount: i,
        merkleRoot: leafHashes.length > 0 ? computeMerkleRoot(leafHashes) : "",
        firstCorruptedSequence: row.sequenceNumber,
        errorReason: "PREVIOUS_HASH_BROKEN",
      };
    }

    // C. Canonical Payload & Preimage Hash Verification
    let parsedPayload: any = row.payload;
    if (typeof row.payload === "string" && row.payload.trim().startsWith("{")) {
      try {
        parsedPayload = JSON.parse(row.payload);
      } catch {
        parsedPayload = row.payload;
      }
    }
    const canonicalPayload = canonicalizePayload(parsedPayload);
    const preimage = computePreimageString({
      sequenceNumber: row.sequenceNumber,
      previousHash: row.previousHash,
      tenantId: row.tenantId,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      canonicalPayloadJSON: canonicalPayload,
      timestamp: row.timestamp,
    });

    const expectedCurrentHash = crypto.createHash("sha256").update(preimage, "utf8").digest("hex");
    if (row.currentHash !== expectedCurrentHash) {
      return {
        valid: false,
        checkedCount: i,
        merkleRoot: leafHashes.length > 0 ? computeMerkleRoot(leafHashes) : "",
        firstCorruptedSequence: row.sequenceNumber,
        errorReason: "HASH_MISMATCH",
      };
    }

    // D. HMAC Signature Authenticity Verification
    const sigValid = verifyAuditHmacSignature(row.currentHash, row.signature || "");
    if (!sigValid) {
      return {
        valid: false,
        checkedCount: i,
        merkleRoot: leafHashes.length > 0 ? computeMerkleRoot(leafHashes) : "",
        firstCorruptedSequence: row.sequenceNumber,
        errorReason: "SIGNATURE_INVALID",
      };
    }

    leafHashes.push(row.currentHash);
    expectedPrevHash = row.currentHash;
    expectedSeq++;
  }

  const merkleRoot = computeMerkleRoot(leafHashes);
  return {
    valid: true,
    checkedCount: rows.length,
    merkleRoot,
  };
}
