/**
 * @jest-environment node
 */
import crypto from "crypto";
import { verifySession, getJwtSecretBytes } from "@thaiba/auth";
import { RazorpayAdapter } from "@/lib/operations/finance/gateways/razorpay-adapter";
import { StripeAdapter } from "@/lib/operations/finance/gateways/stripe-adapter";
import { PaymentCrypto } from "@/lib/operations/finance/security/payment-crypto";
import { POST as engageWebhookPost } from "@/app/api/engage/webhooks/[provider]/route";
import { POST as mdmEnrollPost } from "@/app/api/mobile/mdm/enroll/route";
import { NextRequest } from "next/server";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("R3-1 / Blocker B7: Hardcoded Secret Fallback Elimination & Fail-Closed Enforcement", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Engage Webhooks", () => {
    it("rejects webhook signed with the burned old literal 'thaiba_engage_webhook_secret_2026' when real secret is configured", async () => {
      process.env.ENGAGE_WEBHOOK_SECRET = "real_production_configured_webhook_secret_32chars";
      const payload = JSON.stringify({ event: "message.delivered", messageId: "msg-123" });
      
      // Attacker signs payload with the old literal secret that was removed from codebase
      const forgedOldSig = "sha256=" + crypto.createHmac("sha256", "thaiba_engage_webhook_secret_2026").update(payload).digest("hex");

      const req = new Request("http://localhost:3000/api/engage/webhooks/generic", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-signature": forgedOldSig,
        },
        body: payload,
      });

      const res = await engageWebhookPost(req, { params: Promise.resolve({ provider: "generic" }) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Invalid HMAC webhook signature");
    });

    it("fails closed (returns 401) when ENGAGE_WEBHOOK_SECRET is not configured on the server", async () => {
      delete process.env.ENGAGE_WEBHOOK_SECRET;
      const payload = JSON.stringify({ event: "message.delivered" });
      const sig = "sha256=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

      const req = new Request("http://localhost:3000/api/engage/webhooks/generic", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-signature": sig,
        },
        body: payload,
      });

      const res = await engageWebhookPost(req, { params: Promise.resolve({ provider: "generic" }) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Webhook secret is not configured");
    });
  });

  describe("MDM Enrollment Route", () => {
    beforeEach(() => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: "stf-admin-001",
        email: "admin@thaibahive.edu",
        role: "super_admin",
        employeeId: "EMP-ADM-01",
        name: "Super Admin",
        tokenVersion: 0,
        institutionId: "inst_main",
      });
    });

    it("fails closed (returns 500) when MDM_ENROLLMENT_TOKEN is missing from environment", async () => {
      delete process.env.MDM_ENROLLMENT_TOKEN;
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true });

      const req = new NextRequest("http://localhost:3000/api/mobile/mdm/enroll", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          deviceUuid: "dev-uuid-001",
          enrollmentToken: "valid_enterprise_token",
        }),
      });

      const res = await mdmEnrollPost(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("MDM enrollment token is not configured on server");
    });

    it("rejects enrollment attempt using old literal 'valid_enterprise_token' when secret is configured", async () => {
      process.env.MDM_ENROLLMENT_TOKEN = "custom_enterprise_super_secret_token_98765";

      const req = new NextRequest("http://localhost:3000/api/mobile/mdm/enroll", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          deviceUuid: "dev-uuid-001",
          enrollmentToken: "valid_enterprise_token", // old fallback
        }),
      });

      const res = await mdmEnrollPost(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Invalid or expired enterprise enrollment token");
    });
  });

  describe("Razorpay and Stripe Gateway Adapters", () => {
    it("RazorpayAdapter fails closed when webhook secret is missing", async () => {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      const adapter = new RazorpayAdapter("key_id", "key_secret", "");
      
      const payload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123", amount: 5000 } } } });
      const result = await adapter.processWebhookPayload(payload, "some_signature");

      expect(result.signatureVerified).toBe(false);
      expect(result.status).toBe("failed");
    });

    it("RazorpayAdapter rejects signature signed with old mock secret 'rzp_webhook_secret_mock'", async () => {
      const adapter = new RazorpayAdapter("key_id", "real_key_secret", "real_live_webhook_secret_32chars");
      const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123" } } } });
      
      // Forged with old literal
      const forgedSig = crypto.createHmac("sha256", "rzp_webhook_secret_mock").update(rawBody).digest("hex");
      const result = await adapter.processWebhookPayload(rawBody, forgedSig);

      expect(result.signatureVerified).toBe(false);
      expect(result.status).toBe("failed");
    });

    it("StripeAdapter fails closed when webhook secret is missing", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const adapter = new StripeAdapter("pk_test", "sk_test", "");
      
      const payload = JSON.stringify({ type: "payment_intent.succeeded", data: { object: { id: "pi_123" } } });
      const result = await adapter.processWebhookPayload(payload, "t=12345,v1=sig");

      expect(result.signatureVerified).toBe(false);
      expect(result.status).toBe("failed");
    });

    it("StripeAdapter rejects webhook signed with old mock secret 'whsec_mock_secret'", async () => {
      const adapter = new StripeAdapter("pk_test", "sk_test", "real_live_whsec_secret_32chars");
      const payload = JSON.stringify({ type: "payment_intent.succeeded", data: { object: { id: "pi_123" } } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      // Forged with old literal
      const forgedSig = crypto.createHmac("sha256", "whsec_mock_secret").update(`${timestamp}.${payload}`).digest("hex");
      const sigHeader = `t=${timestamp},v1=${forgedSig}`;

      const result = await adapter.processWebhookPayload(payload, sigHeader);
      expect(result.signatureVerified).toBe(false);
      expect(result.status).toBe("failed");
    });
  });

  describe("PaymentCrypto Master Key", () => {
    it("PaymentCrypto throws in non-test mode if PAYMENT_ENCRYPTION_KEY is missing", () => {
      delete process.env.PAYMENT_ENCRYPTION_KEY;
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true, configurable: true });

      expect(() => {
        PaymentCrypto.encryptSecret("sensitive-card-data");
      }).toThrow(/PAYMENT_ENCRYPTION_KEY must be configured/);
    });
  });
});
