import { db } from "@/db";
import { financialTransactions } from "@thaiba/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const SECRET_KEY = process.env.JWT_SECRET || "thaibahive-exam-secret-key-2026";

export interface FeeClearanceResult {
  feeCleared: boolean;
  pendingAmount: number;
}

/**
 * Checks if a student has any pending fee dues with the Finance Module.
 */
export async function checkStudentFeeClearance(studentId: string): Promise<FeeClearanceResult> {
  // Query pending transactions or fee dues for student
  const dues = await db
    .select({
      totalDue: sql<number>`COALESCE(SUM(CASE WHEN ${financialTransactions.type} = 'debit' THEN ${financialTransactions.amount} ELSE -${financialTransactions.amount} END), 0)`,
    })
    .from(financialTransactions)
    .where(eq(financialTransactions.recordedById, studentId));

  const pending = dues[0]?.totalDue ? Number(dues[0].totalDue) : 0;
  
  if (pending > 0) {
    return { feeCleared: false, pendingAmount: pending };
  }

  return { feeCleared: true, pendingAmount: 0 };
}

/**
 * Generates cryptographic QR payload string for hall ticket verification.
 */
export function generateQRPayload(ticketNumber: string, studentId: string, examId: string): string {
  const timestamp = new Date().toISOString();
  const dataString = `${ticketNumber}:${studentId}:${examId}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", SECRET_KEY).update(dataString).digest("hex");

  const payload = {
    ticketNumber,
    studentId,
    examId,
    timestamp,
    signature: hmac.substring(0, 16),
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Validates QR payload scanned by invigilators at exam hall entrance.
 */
export function verifyQRPayload(qrPayloadBase64: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const jsonStr = Buffer.from(qrPayloadBase64, "base64").toString("utf-8");
    const parsed = JSON.parse(jsonStr);

    if (!parsed.ticketNumber || !parsed.studentId || !parsed.examId || !parsed.signature) {
      return { valid: false, error: "Invalid QR payload structure" };
    }

    const dataString = `${parsed.ticketNumber}:${parsed.studentId}:${parsed.examId}:${parsed.timestamp}`;
    const expectedHmac = crypto.createHmac("sha256", SECRET_KEY).update(dataString).digest("hex").substring(0, 16);

    if (parsed.signature !== expectedHmac) {
      return { valid: false, error: "Signature verification failed (tampered QR code)" };
    }

    return { valid: true, payload: parsed };
  } catch (err: any) {
    return { valid: false, error: "Corrupted or malformed QR code" };
  }
}
