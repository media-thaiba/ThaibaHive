/**
 * Integration tests for /api/webhooks/edge-security endpoint
 * Sprint-039 / TIF-006 (TD-015)
 */

import crypto from "crypto";
import { POST } from "../../../app/api/webhooks/edge-security/route";
import { QuarantineManager } from "../../security/quarantine-manager";

describe("Edge Security Webhook Route Integration (TIF-006)", () => {
  beforeEach(() => {
    QuarantineManager.getInstance().reset();
    process.env.EDGE_WEBHOOK_SECRET = "integration-webhook-secret-999";
  });

  afterEach(() => {
    delete process.env.EDGE_WEBHOOK_SECRET;
  });

  it("quarantines IP on verified critical WAF event", async () => {
    const payload = JSON.stringify({
      eventType: "WAF_BLOCK_EVENT",
      ipAddress: "198.51.100.111",
      reason: "SQL Injection attack blocked by edge WAF",
      threatLevel: "CRITICAL",
    });

    const signature = crypto
      .createHmac("sha256", "integration-webhook-secret-999")
      .update(payload)
      .digest("hex");

    const req = new Request("http://localhost/api/webhooks/edge-security", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-sha256": signature,
        "x-webhook-timestamp": String(Date.now()),
      },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("acknowledged");
    expect(json.ipAddress).toBe("198.51.100.111");
    expect(QuarantineManager.getInstance().isBanned("198.51.100.111")).toBe(true);
  });

  it("returns 401 when signature is invalid or missing", async () => {
    const payload = JSON.stringify({
      eventType: "WAF_BLOCK_EVENT",
      ipAddress: "198.51.100.222",
      reason: "Testing invalid signature",
    });

    const req = new Request("http://localhost/api/webhooks/edge-security", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-sha256": "bad-signature",
      },
      body: payload,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
