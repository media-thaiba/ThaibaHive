/**
 * Unit tests for EdgeWebhookValidator (TIF-006 / TD-015)
 */

import crypto from "crypto";
import { EdgeWebhookValidator } from "../../security/edge-webhook-validator";

describe("EdgeWebhookValidator (TIF-006)", () => {
  const secret = "test-secret-key-12345";
  let validator: EdgeWebhookValidator;

  beforeEach(() => {
    validator = new EdgeWebhookValidator({ secret });
  });

  it("validates correct HMAC signature", () => {
    const body = JSON.stringify({ ip: "198.51.100.1" });
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

    const res = validator.validate(body, hmac);
    expect(res.valid).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it("supports sha256= prefix in signature header", () => {
    const body = JSON.stringify({ ip: "198.51.100.2" });
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

    const res = validator.validate(body, `sha256=${hmac}`);
    expect(res.valid).toBe(true);
  });

  it("rejects forged signature with 401", () => {
    const body = JSON.stringify({ ip: "198.51.100.3" });
    const res = validator.validate(body, "0000000000000000000000000000000000000000000000000000000000000000");

    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.error).toContain("Invalid webhook HMAC");
  });

  it("fails closed in production if secret is unconfigured", () => {
    const emptyValidator = new EdgeWebhookValidator({ secret: "" });
    const body = "{}";

    const res = emptyValidator.validate(body, null, null, true); // isProduction = true
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.error).toContain("EDGE_WEBHOOK_SECRET is not configured");
  });

  it("validates timestamp drift and rejects expired timestamps", () => {
    const body = JSON.stringify({ ip: "198.51.100.4" });
    const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

    // 1. Fresh timestamp
    const freshRes = validator.validate(body, hmac, String(Date.now()));
    expect(freshRes.valid).toBe(true);

    // 2. Expired timestamp (10 minutes old)
    const expiredTimestamp = Date.now() - 600000;
    const expiredRes = validator.validate(body, hmac, String(expiredTimestamp));
    expect(expiredRes.valid).toBe(false);
    expect(expiredRes.statusCode).toBe(400);
    expect(expiredRes.error).toContain("expired or drifted");
  });
});
