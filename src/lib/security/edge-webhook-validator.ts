/**
 * Strict Edge Webhook Authentication & Timestamp Validator
 * Sprint-039 / TIF-006 (TD-015)
 */

import crypto from "crypto";

export interface WebhookValidationResult {
  valid: boolean;
  statusCode: number;
  error?: string;
  code?: string;
}

export interface WebhookValidationOptions {
  secret?: string;
  maxTimestampDriftSeconds?: number;
  enforceInTest?: boolean;
}

export class EdgeWebhookValidator {
  private secret: string;
  private maxTimestampDriftSeconds: number;

  constructor(options?: WebhookValidationOptions) {
    this.secret = options?.secret ?? process.env.EDGE_WEBHOOK_SECRET ?? "";
    this.maxTimestampDriftSeconds = options?.maxTimestampDriftSeconds ?? 300; // 5 minutes
  }

  /**
   * Validates webhook signature and timestamp freshness.
   */
  public validate(
    rawBody: string,
    signatureHeader: string | null,
    timestampHeader?: string | null,
    isProduction: boolean = process.env.NODE_ENV === "production"
  ): WebhookValidationResult {
    // 1. Check secret configuration in production
    if (!this.secret) {
      if (isProduction) {
        return {
          valid: false,
          statusCode: 401,
          code: "MISSING_SECRET_CONFIGURATION",
          error: "EDGE_WEBHOOK_SECRET is not configured in production environment",
        };
      }
      // In non-production without secret, pass if no signature expected
      return { valid: true, statusCode: 200 };
    }

    // 2. Signature must be provided when secret is configured
    if (!signatureHeader) {
      return {
        valid: false,
        statusCode: 401,
        code: "MISSING_SIGNATURE",
        error: "Missing required webhook signature header (x-signature-sha256 or x-edge-signature)",
      };
    }

    // Normalize signature header (strip "sha256=" prefix if present)
    const normalizedSignature = signatureHeader.startsWith("sha256=")
      ? signatureHeader.substring(7)
      : signatureHeader;

    // 3. Validate timestamp freshness if provided
    if (timestampHeader) {
      const timestampMs = isNaN(Number(timestampHeader))
        ? new Date(timestampHeader).getTime()
        : Number(timestampHeader) > 1e11
        ? Number(timestampHeader)
        : Number(timestampHeader) * 1000;

      if (isNaN(timestampMs)) {
        return {
          valid: false,
          statusCode: 400,
          code: "MALFORMED_TIMESTAMP",
          error: "Malformed X-Webhook-Timestamp header",
        };
      }

      const driftSeconds = Math.abs(Date.now() - timestampMs) / 1000;
      if (driftSeconds > this.maxTimestampDriftSeconds) {
        return {
          valid: false,
          statusCode: 400,
          code: "TIMESTAMP_EXPIRED",
          error: `Webhook timestamp expired or drifted beyond tolerance (${Math.round(driftSeconds)}s > ${this.maxTimestampDriftSeconds}s)`,
        };
      }
    }

    // 4. Constant-time HMAC SHA-256 verification
    try {
      const expectedHmac = crypto
        .createHmac("sha256", this.secret)
        .update(rawBody)
        .digest("hex");

      const sigBuf = Buffer.from(normalizedSignature);
      const expBuf = Buffer.from(expectedHmac);

      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return {
          valid: false,
          statusCode: 401,
          code: "INVALID_SIGNATURE",
          error: "Invalid webhook HMAC SHA-256 signature",
        };
      }

      return { valid: true, statusCode: 200 };
    } catch {
      return {
        valid: false,
        statusCode: 401,
        code: "SIGNATURE_EVALUATION_FAILED",
        error: "Failed to evaluate webhook signature",
      };
    }
  }
}
