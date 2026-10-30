import crypto from "crypto";
import { getAuditHmacSecret } from "@thaiba/auth";

export const GENESIS_PREV_HASH = "0".repeat(64);

/**
 * Recursively sorts object keys lexicographically at every depth,
 * strips undefined properties, preserves array element ordering,
 * ensuring deterministic canonical JSON output across runtimes and DB engines.
 */
export function canonicalizePayload(payload: any): string {
  if (payload === undefined || payload === null || payload === "") {
    return "";
  }

  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object") {
        return canonicalizePayload(parsed);
      }
    } catch {
      return payload;
    }
  }

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
      if (obj[key] !== undefined) {
        result[key] = canonicalize(obj[key]);
      }
    }
    return result;
  };

  return JSON.stringify(canonicalize(payload));
}

export interface PreimageParams {
  sequenceNumber: number;
  previousHash: string;
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  canonicalPayloadJSON: string;
  timestamp: string;
}

/**
 * Constructs an unambiguous canonical preimage tuple serialized as a JSON array.
 * Guardrail 1: Using a JSON array over primitives prevents field-boundary shifting
 * and pipe (|) injection attacks if action or entityId contain delimiter characters.
 */
export function computePreimageString(params: PreimageParams): string {
  return JSON.stringify([
    "v1",
    params.sequenceNumber,
    params.previousHash || GENESIS_PREV_HASH,
    params.tenantId,
    params.userId || "anonymous",
    params.action,
    params.entityType,
    params.entityId || "",
    params.canonicalPayloadJSON,
    params.timestamp,
  ]);
}

/**
 * Computes the 64-char lowercase SHA-256 hash of the canonical preimage.
 */
export function computeAuditBlockHash(params: PreimageParams): string {
  const preimage = computePreimageString(params);
  return crypto.createHash("sha256").update(preimage, "utf8").digest("hex");
}

/**
 * Derives the HMAC-SHA256 signature for the block hash using the HKDF audit signing key.
 */
export function computeAuditHmac(currentHash: string, hmacKeyHex?: string): string {
  const secret = hmacKeyHex || getAuditHmacSecret();
  return crypto.createHmac("sha256", secret).update(currentHash, "utf8").digest("hex");
}

/**
 * Verifies an HMAC-SHA256 signature in constant time using crypto.timingSafeEqual.
 * Guardrail 1: Validates that signature is a valid 64-character lowercase/uppercase hex string
 * before converting to a 32-byte buffer, preventing RangeErrors on malformed inputs.
 */
export function verifyAuditHmacSignature(
  currentHash: string,
  signature: string,
  hmacKeyHex?: string
): boolean {
  if (!signature || typeof signature !== "string" || signature.length !== 64) {
    return false;
  }
  if (!/^[0-9a-fA-F]{64}$/.test(signature)) {
    return false;
  }

  const expectedSig = computeAuditHmac(currentHash, hmacKeyHex);
  const bufActual = Buffer.from(signature, "hex");
  const bufExpected = Buffer.from(expectedSig, "hex");

  if (bufActual.length !== bufExpected.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufActual, bufExpected);
}
