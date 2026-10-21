import { db } from "@/db";
import { feeStudentAllocations } from "@thaiba/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import { getJwtSecret } from "@thaiba/auth";

export interface FeeClearanceResult {
  feeCleared: boolean;
  pendingAmount: number;
}

export interface QRPayloadData {
  ticketNumber: string;
  studentId: string;
  examId: string;
  timestamp: string;
  nonce?: string;
  expiresAt?: string;
  signature: string;
}

/**
 * Checks if a student has any pending fee dues with the Finance Module.
 * Accurately aggregates outstanding balances from student fee allocations.
 */
export async function checkStudentFeeClearance(studentId: string): Promise<FeeClearanceResult> {
  const dues = await db
    .select({
      totalDue: sql<number>`COALESCE(SUM(${feeStudentAllocations.balanceAmount}), 0)`,
    })
    .from(feeStudentAllocations)
    .where(
      and(
        eq(feeStudentAllocations.studentId, studentId),
        inArray(feeStudentAllocations.status, ["unpaid", "partial", "overdue"])
      )
    );

  const pending = dues[0]?.totalDue ? Number(dues[0].totalDue) : 0;
  
  if (pending > 0) {
    return { feeCleared: false, pendingAmount: Math.round(pending * 100) / 100 };
  }

  return { feeCleared: true, pendingAmount: 0 };
}

/**
 * Generates cryptographic QR payload string for hall ticket verification.
 * Embeds nonce and 24h expiration timestamp to prevent replay attacks.
 */
export function generateQRPayload(
  ticketNumber: string,
  studentId: string,
  examId: string,
  options?: { nonce?: string; ttlHours?: number; legacyFormat?: boolean }
): string {
  const timestamp = new Date().toISOString();
  const nonce = options?.nonce || crypto.randomUUID();
  const ttlHours = options?.ttlHours ?? 24;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  // Signature data string incorporates nonce to prevent replay attacks
  const dataString = `${ticketNumber}:${studentId}:${examId}:${timestamp}:${nonce}`;
  const secretKey = getJwtSecret("hall-ticket");
  const fullHmac = crypto.createHmac("sha256", secretKey).update(dataString).digest("hex");

  const payload: QRPayloadData = {
    ticketNumber,
    studentId,
    examId,
    timestamp,
    nonce,
    expiresAt,
    signature: options?.legacyFormat ? fullHmac.substring(0, 16) : fullHmac,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Validates QR payload scanned by invigilators at exam hall entrance.
 * Verifies HMAC signature (full 64-char or legacy 16-char) and asserts expiration.
 */
export function verifyQRPayload(
  qrPayloadBase64: string,
  options?: { allowExpired?: boolean }
): { valid: boolean; payload?: any; error?: string } {
  try {
    const jsonStr = Buffer.from(qrPayloadBase64, "base64").toString("utf-8");
    const parsed = JSON.parse(jsonStr);

    if (!parsed.ticketNumber || !parsed.studentId || !parsed.examId || !parsed.signature) {
      return { valid: false, error: "Invalid QR payload structure" };
    }

    // Expiration check (24h or explicit expiresAt)
    if (!options?.allowExpired) {
      if (parsed.expiresAt) {
        if (new Date(parsed.expiresAt).getTime() < Date.now()) {
          return { valid: false, error: "QR code has expired" };
        }
      } else if (parsed.timestamp) {
        // Fallback for legacy payloads without explicit expiresAt: max 24 hours
        const issueTime = new Date(parsed.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - issueTime > maxAge) {
          return { valid: false, error: "QR code has expired" };
        }
      }
    }

    const secretKey = getJwtSecret("hall-ticket");
    const providedSig = String(parsed.signature);

    // Verify signature against either modern payload format (with nonce) or legacy format
    let expectedSig: string;
    if (parsed.nonce) {
      const dataString = `${parsed.ticketNumber}:${parsed.studentId}:${parsed.examId}:${parsed.timestamp}:${parsed.nonce}`;
      expectedSig = crypto.createHmac("sha256", secretKey).update(dataString).digest("hex");
    } else {
      const legacyDataString = `${parsed.ticketNumber}:${parsed.studentId}:${parsed.examId}:${parsed.timestamp}`;
      expectedSig = crypto.createHmac("sha256", secretKey).update(legacyDataString).digest("hex");
    }

    // Check if provided signature is legacy 16-char or full 64-char
    const expectedComp = providedSig.length === 16 ? expectedSig.substring(0, 16) : expectedSig;

    const provided = Buffer.from(providedSig);
    const expected = Buffer.from(expectedComp);

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return { valid: false, error: "Signature verification failed (tampered QR code)" };
    }

    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, error: "Corrupted or malformed QR code" };
  }
}
