import { generateQRPayload, verifyQRPayload } from "../hall-ticket-service";
import crypto from "crypto";
import { getJwtSecret } from "@thaiba/auth";

describe("Hall Ticket & QR Verification Engine", () => {
  it("should generate a valid modern QR payload with 64-char HMAC, nonce, and expiration", () => {
    const qrPayload = generateQRPayload("HT-1001", "stud_01", "exam_100");
    expect(qrPayload).toBeDefined();
    expect(typeof qrPayload).toBe("string");

    const verification = verifyQRPayload(qrPayload);
    expect(verification.valid).toBe(true);
    expect(verification.payload.ticketNumber).toBe("HT-1001");
    expect(verification.payload.studentId).toBe("stud_01");
    expect(verification.payload.examId).toBe("exam_100");
    expect(verification.payload.nonce).toBeDefined();
    expect(verification.payload.expiresAt).toBeDefined();
    expect(verification.payload.signature.length).toBe(64); // Full SHA-256 HMAC
  });

  it("should reject expired QR payloads (replay prevention)", () => {
    // Generate payload with negative TTL (-1 hour)
    const expiredPayload = generateQRPayload("HT-1002", "stud_02", "exam_100", { ttlHours: -1 });
    const result = verifyQRPayload(expiredPayload);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it("should support backwards compatibility with legacy 16-char signatures", () => {
    const timestamp = new Date().toISOString();
    const dataString = `HT-LEGACY:stud_legacy:exam_legacy:${timestamp}`;
    const secretKey = getJwtSecret("hall-ticket");
    const hmac = crypto.createHmac("sha256", secretKey).update(dataString).digest("hex");

    const legacyPayload = {
      ticketNumber: "HT-LEGACY",
      studentId: "stud_legacy",
      examId: "exam_legacy",
      timestamp,
      signature: hmac.substring(0, 16),
    };

    const base64 = Buffer.from(JSON.stringify(legacyPayload)).toString("base64");
    const result = verifyQRPayload(base64);

    expect(result.valid).toBe(true);
    expect(result.payload.ticketNumber).toBe("HT-LEGACY");
  });

  it("should reject tampered signature, nonce, or data fields", () => {
    const qrPayload = generateQRPayload("HT-1003", "stud_03", "exam_100");
    const jsonStr = Buffer.from(qrPayload, "base64").toString("utf-8");
    const parsed = JSON.parse(jsonStr);

    // Tamper with ticketNumber
    const tamperedTicket = Buffer.from(JSON.stringify({ ...parsed, ticketNumber: "HT-TAMPERED" })).toString("base64");
    expect(verifyQRPayload(tamperedTicket).valid).toBe(false);

    // Tamper with nonce
    const tamperedNonce = Buffer.from(JSON.stringify({ ...parsed, nonce: crypto.randomUUID() })).toString("base64");
    expect(verifyQRPayload(tamperedNonce).valid).toBe(false);

    // Tamper with signature
    const tamperedSig = Buffer.from(JSON.stringify({ ...parsed, signature: parsed.signature.slice(0, -1) + "0" })).toString("base64");
    expect(verifyQRPayload(tamperedSig).valid).toBe(false);
  });

  it("should reject corrupted or non-JSON payloads gracefully", () => {
    const invalidPayload = Buffer.from("invalid-json").toString("base64");
    const result = verifyQRPayload(invalidPayload);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/corrupted|malformed/i);
  });
});
