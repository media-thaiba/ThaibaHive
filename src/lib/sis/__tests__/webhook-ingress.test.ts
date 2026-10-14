import { POST as handleWebhook, clearWebhookNonceCache } from "@/app/api/sis/webhooks/[connectorId]/route";
import { ConnectorRegistry } from "../connector-registry";
import { CredentialVault } from "../credential-vault";
import { EgressGuard } from "../egress-guard";
import { RecordMapper } from "../record-mapper";
import { setTenantFeatureFlag, clearTenantFeatureOverrides } from "@/lib/features";
import { createHmac } from "crypto";

describe("Wave 3: SIS Webhook Ingress Security & Replay Defense (Gates 12 & 18)", () => {
  const tenantA = "inst_campus_alpha";
  const connectorId = "sisc_webhook_test";
  const secretKey = "webhook_secret_key_123";

  beforeEach(async () => {
    ConnectorRegistry.setUseMemory(true);
    ConnectorRegistry.clearMemory();
    RecordMapper.setUseMemory(true);
    RecordMapper.clearMemory();
    CredentialVault.clearTestCredentials();
    EgressGuard.clearDnsMocks();
    EgressGuard.setDnsMock("sis.myschool.edu", ["93.184.216.34"]);
    clearTenantFeatureOverrides();
    clearWebhookNonceCache();

    setTenantFeatureFlag(tenantA, "sis_sync", true);
    CredentialVault.setTestCredential("WH_KEY_REF", secretKey);

    await ConnectorRegistry.createConnector(tenantA, {
      name: "Webhook Connector",
      standard: "edfi",
      baseUrl: "https://sis.myschool.edu/api",
      credentialRef: "WH_KEY_REF",
      authMode: "apiKey",
      enabled: true,
    });
  });

  afterEach(() => {
    ConnectorRegistry.clearMemory();
    RecordMapper.clearMemory();
    CredentialVault.clearTestCredentials();
    clearTenantFeatureOverrides();
    clearWebhookNonceCache();
  });

  async function getCreatedConnectorId(): Promise<string> {
    const connectors = await ConnectorRegistry.listConnectors(tenantA);
    return connectors[0].id;
  }

  function signPayload(payload: string, timestamp: number, secret: string): string {
    return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  }

  it("returns 401 Unauthorized when missing authentication headers (Gate 12)", async () => {
    const connId = await getCreatedConnectorId();
    const req = new Request(`http://localhost/api/sis/webhooks/${connId}`, {
      method: "POST",
      body: JSON.stringify({ event: "create", entityType: "student", externalId: "123" }),
    });

    const res = await handleWebhook(req, { params: Promise.resolve({ connectorId: connId }) });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Missing required webhook authentication headers");
  });

  it("returns 401 Unauthorized on timestamp outside ±300s window (Gate 18)", async () => {
    const connId = await getCreatedConnectorId();
    const staleTimestamp = Math.floor(Date.now() / 1000) - 350; // 350s in the past
    const body = JSON.stringify({ event: "create", entityType: "student", externalId: "123" });
    const sig = signPayload(body, staleTimestamp, secretKey);

    const req = new Request(`http://localhost/api/sis/webhooks/${connId}`, {
      method: "POST",
      headers: {
        "x-thaiba-signature": sig,
        "x-thaiba-timestamp": String(staleTimestamp),
        "x-thaiba-nonce": "nonce_stale_1",
      },
      body,
    });

    const res = await handleWebhook(req, { params: Promise.resolve({ connectorId: connId }) });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("outside tolerance window");
  });

  it("returns 401 Unauthorized on invalid HMAC signature (Gate 12)", async () => {
    const connId = await getCreatedConnectorId();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event: "create", entityType: "student", externalId: "123" });
    const invalidSig = signPayload(body, timestamp, "wrong_secret");

    const req = new Request(`http://localhost/api/sis/webhooks/${connId}`, {
      method: "POST",
      headers: {
        "x-thaiba-signature": invalidSig,
        "x-thaiba-timestamp": String(timestamp),
        "x-thaiba-nonce": "nonce_bad_sig",
      },
      body,
    });

    const res = await handleWebhook(req, { params: Promise.resolve({ connectorId: connId }) });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Invalid webhook HMAC signature");
  });

  it("returns 401 Unauthorized on nonce replay (Gate 18)", async () => {
    const connId = await getCreatedConnectorId();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event: "create", entityType: "student", externalId: "123" });
    const sig = signPayload(body, timestamp, secretKey);
    const nonce = "unique_nonce_12345";

    // First request -> 200 OK
    const req1 = new Request(`http://localhost/api/sis/webhooks/${connId}`, {
      method: "POST",
      headers: {
        "x-thaiba-signature": sig,
        "x-thaiba-timestamp": String(timestamp),
        "x-thaiba-nonce": nonce,
      },
      body,
    });

    const res1 = await handleWebhook(req1, { params: Promise.resolve({ connectorId: connId }) });
    expect(res1.status).toBe(200);

    // Replay attempt with same nonce -> 401 Unauthorized
    const req2 = new Request(`http://localhost/api/sis/webhooks/${connId}`, {
      method: "POST",
      headers: {
        "x-thaiba-signature": sig,
        "x-thaiba-timestamp": String(timestamp),
        "x-thaiba-nonce": nonce,
      },
      body,
    });

    const res2 = await handleWebhook(req2, { params: Promise.resolve({ connectorId: connId }) });
    expect(res2.status).toBe(401);
    const json2 = await res2.json();
    expect(json2.error).toContain("replay detected");
  });

  it("processes valid webhook event and updates record mapper", async () => {
    const connId = await getCreatedConnectorId();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      event: "update",
      entityType: "student",
      externalId: "WH_STU_888",
      data: { firstName: "Samir", email: "samir@school.edu" },
    });
    const sig = signPayload(body, timestamp, secretKey);

    const req = new Request(`http://localhost/api/sis/webhooks/${connId}`, {
      method: "POST",
      headers: {
        "x-thaiba-signature": `sha256=${sig}`,
        "x-thaiba-timestamp": String(timestamp),
        "x-thaiba-nonce": "fresh_nonce_999",
      },
      body,
    });

    const res = await handleWebhook(req, { params: Promise.resolve({ connectorId: connId }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.processed).toBe(1);

    // Verify record exists in RecordMapper queue
    const queue = await RecordMapper.listQueueItems(tenantA);
    expect(queue.some((q) => q.externalId === "WH_STU_888")).toBe(true);
  });
});
