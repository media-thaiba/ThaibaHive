import crypto from "crypto";

const HMAC_SECRET = process.env.VISITOR_HMAC_SECRET || "thaibahive_visitor_secret_key_2026";

export type VisitorQrPayload = {
  institutionId: string;
  visitorId: string;
  hostId: string;
  validFrom: string;
  validUntil: string;
  nonce: string;
  signature?: string;
};

export class VisitorQrPassService {
  static generateSignature(payloadStr: string): string {
    return crypto.createHmac("sha256", HMAC_SECRET).update(payloadStr).digest("hex");
  }

  static issuePassPayload(params: {
    institutionId: string;
    visitorId: string;
    hostId: string;
    validFrom: string;
    validUntil: string;
  }): { qrPayload: string; signature: string } {
    const nonce = crypto.randomBytes(8).toString("hex");
    const rawString = `${params.institutionId}|${params.visitorId}|${params.hostId}|${params.validFrom}|${params.validUntil}|${nonce}`;
    const signature = this.generateSignature(rawString);
    const qrPayload = `VIS|${rawString}|${signature}`;
    return { qrPayload, signature };
  }

  static verifyPassPayload(qrPayload: string): {
    valid: boolean;
    reason?: string;
    payload?: VisitorQrPayload;
  } {
    if (!qrPayload.startsWith("VIS|")) {
      return { valid: false, reason: "Invalid QR payload format" };
    }

    const parts = qrPayload.split("|");
    if (parts.length < 8) {
      return { valid: false, reason: "Malformed visitor QR payload segments" };
    }

    const [, institutionId, visitorId, hostId, validFrom, validUntil, nonce, providedSignature] = parts;
    const rawString = `${institutionId}|${visitorId}|${hostId}|${validFrom}|${validUntil}|${nonce}`;
    const expectedSignature = this.generateSignature(rawString);

    if (providedSignature !== expectedSignature) {
      return { valid: false, reason: "Invalid cryptographic HMAC signature (tampered QR pass)" };
    }

    const now = new Date();
    const from = new Date(validFrom);
    const until = new Date(validUntil);

    if (now < from || now > until) {
      return { valid: false, reason: "Visitor QR pass expired or not yet valid for entry" };
    }

    return {
      valid: true,
      payload: {
        institutionId,
        visitorId,
        hostId,
        validFrom,
        validUntil,
        nonce,
        signature: providedSignature,
      },
    };
  }
}
