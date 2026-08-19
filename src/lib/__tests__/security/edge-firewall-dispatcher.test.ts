/**
 * Unit Tests for EdgeFirewallDispatcher and Webhook Route
 * Sprint-038 / AGS-008
 */

import crypto from "crypto";
import { EdgeFirewallDispatcher } from "../../security/edge-firewall-dispatcher";
import { POST } from "../../../app/api/webhooks/edge-security/route";
import { QuarantineManager } from "../../security/quarantine-manager";

describe("EdgeFirewallDispatcher & Webhook (AGS-008)", () => {
  beforeEach(() => {
    QuarantineManager.getInstance().reset();
    delete process.env.EDGE_WEBHOOK_SECRET;
  });

  it("should dispatch sync in mock mode cleanly", async () => {
    const dispatcher = new EdgeFirewallDispatcher("mock");
    const res = await dispatcher.syncQuarantine("198.51.100.100", "credential attack");

    expect(res.success).toBe(true);
    expect(res.provider).toBe("mock");
    expect(res.ruleId).toBeDefined();
  });

  it("should bypass dispatch when provider is none", async () => {
    const dispatcher = new EdgeFirewallDispatcher("none");
    const res = await dispatcher.syncQuarantine("198.51.100.100", "test");

    expect(res.success).toBe(true);
    expect(res.provider).toBe("none");
  });

  it("should process valid edge security webhook and quarantine on critical event", async () => {
    const req = new Request("http://localhost/api/webhooks/edge-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "WAF_BLOCK_EVENT",
        ipAddress: "203.0.113.77",
        reason: "SQLi injection attempt blocked at Cloudflare edge",
        threatLevel: "CRITICAL",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("acknowledged");
    expect(json.ipAddress).toBe("203.0.113.77");
    expect(QuarantineManager.getInstance().isBanned("203.0.113.77")).toBe(true);
  });

  it("should validate HMAC signature when EDGE_WEBHOOK_SECRET is configured", async () => {
    process.env.EDGE_WEBHOOK_SECRET = "super-secret-key-123";
    const bodyStr = JSON.stringify({
      eventType: "WAF_BLOCK_EVENT",
      ipAddress: "203.0.113.88",
      reason: "DDoS mitigation trigger",
      threatLevel: "CRITICAL",
    });
    const validHmac = crypto.createHmac("sha256", "super-secret-key-123").update(bodyStr).digest("hex");

    // 1. Valid HMAC
    const validReq = new Request("http://localhost/api/webhooks/edge-security", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-sha256": validHmac,
      },
      body: bodyStr,
    });
    const validRes = await POST(validReq);
    expect(validRes.status).toBe(200);

    // 2. Invalid HMAC
    const invalidReq = new Request("http://localhost/api/webhooks/edge-security", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature-sha256": "forged-signature-000",
      },
      body: bodyStr,
    });
    const invalidRes = await POST(invalidReq);
    expect(invalidRes.status).toBe(401);
  });

  it("should reject invalid webhook payloads with 400", async () => {
    const req = new Request("http://localhost/api/webhooks/edge-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missingIp: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
