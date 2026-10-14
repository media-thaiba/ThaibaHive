import { GET as getConnectors, POST as createConnector } from "@/app/api/sis/connectors/route";
import { POST as testConnector } from "@/app/api/sis/connectors/[id]/test/route";
import { POST as triggerSync } from "@/app/api/sis/connectors/[id]/sync/route";
import { GET as getRuns } from "@/app/api/sis/runs/route";
import { GET as getRunById } from "@/app/api/sis/runs/[id]/route";
import { ConnectorRegistry } from "../connector-registry";
import { SyncRunEngine } from "../sync-run-engine";
import { CredentialVault } from "../credential-vault";
import { EgressGuard } from "../egress-guard";
import { setTenantFeatureFlag, clearTenantFeatureOverrides } from "@/lib/features";

const mockSession = {
  current: {
    userId: "usr_admin",
    staffId: "usr_admin",
    email: "admin@thaiba.edu",
    role: "admin",
    institutionId: "inst_campus_alpha",
    permissions: ["sis:read", "sis:manage", "sis:sync"],
  } as any,
};

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve(mockSession.current)),
    resolveInstitutionScopeForSession: jest.fn().mockImplementation(() =>
      Promise.resolve(mockSession.current?.institutionId || "inst_campus_alpha")
    ),
  };
});

describe("Wave 2: SIS Connectors & Runs API Route Handlers", () => {
  const tenantA = "inst_campus_alpha";

  beforeEach(() => {
    ConnectorRegistry.setUseMemory(true);
    ConnectorRegistry.clearMemory();
    SyncRunEngine.setUseMemory(true);
    SyncRunEngine.clearMemory();
    CredentialVault.clearTestCredentials();
    EgressGuard.clearDnsMocks();
    clearTenantFeatureOverrides();

    // Reset default authorized admin session
    mockSession.current = {
      userId: "usr_admin",
      staffId: "usr_admin",
      email: "admin@thaiba.edu",
      role: "admin",
      institutionId: tenantA,
      permissions: ["sis:read", "sis:manage", "sis:sync"],
    };

    // Enable feature flag for tenantA during tests
    setTenantFeatureFlag(tenantA, "sis_sync", true);
    EgressGuard.setDnsMock("sis.myschool.edu", ["93.184.216.34"]);
  });

  afterEach(() => {
    ConnectorRegistry.clearMemory();
    SyncRunEngine.clearMemory();
    CredentialVault.clearTestCredentials();
    EgressGuard.clearDnsMocks();
    clearTenantFeatureOverrides();
  });

  describe("Authentication & RBAC Gateways (Gate 13)", () => {
    it("returns 401 Unauthorized when no active session is present", async () => {
      mockSession.current = null;

      const req = new Request("http://localhost/api/sis/connectors");
      const res = await getConnectors(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 Forbidden when staff role attempts sis:manage (Gate 13)", async () => {
      mockSession.current = {
        userId: "usr_staff",
        staffId: "usr_staff",
        email: "staff@thaiba.edu",
        role: "staff",
        institutionId: tenantA,
        permissions: [],
      };

      const req = new Request("http://localhost/api/sis/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unauthorized Connector",
          standard: "edfi",
          baseUrl: "https://sis.myschool.edu/api",
          credentialRef: "KEY",
        }),
      });

      const res = await createConnector(req);
      expect(res.status).toBe(403);
    });

    it("returns 403 Forbidden when hod role attempts sis:sync (Gate 13)", async () => {
      mockSession.current = {
        userId: "usr_hod",
        staffId: "usr_hod",
        email: "hod@thaiba.edu",
        role: "hod",
        institutionId: tenantA,
        permissions: [],
      };

      const req = new Request("http://localhost/api/sis/connectors/sisc_123/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full" }),
      });

      const res = await triggerSync(req, { params: Promise.resolve({ id: "sisc_123" }) });
      expect(res.status).toBe(403);
    });
  });

  describe("Feature Flag Guarding", () => {
    it("returns 403 Forbidden when sis_sync feature is disabled for tenant", async () => {
      setTenantFeatureFlag(tenantA, "sis_sync", false);

      const req = new Request("http://localhost/api/sis/connectors");
      const res = await getConnectors(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toContain("disabled");
    });
  });

  describe("Connectors CRUD Endpoints", () => {
    it("creates a connector and returns a masked DTO", async () => {
      CredentialVault.setTestCredential("EDFI_SECRET_KEY", "real-secret-token");

      const req = new Request("http://localhost/api/sis/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Main EdFi Hub",
          standard: "edfi",
          baseUrl: "https://sis.myschool.edu/api/v5",
          credentialRef: "EDFI_SECRET_KEY",
          authMode: "oauth2",
          enabled: true,
        }),
      });

      const res = await createConnector(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.connector).toBeDefined();
      expect(json.connector.id).toMatch(/^sisc_/);
      expect(json.connector.name).toBe("Main EdFi Hub");
      expect(json.connector.credentialRef).toBeUndefined(); // Masked!
      expect(json.connector.credentialRefMasked).toBe("***-_KEY");
      expect(json.connector.hasCredential).toBe(true);
    });

    it("rejects invalid connector payload with 400", async () => {
      const req = new Request("http://localhost/api/sis/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          standard: "invalid_standard",
          baseUrl: "not-a-url",
        }),
      });

      const res = await createConnector(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
    });

    it("lists connectors for tenant with masked credentials", async () => {
      await ConnectorRegistry.createConnector(tenantA, {
        name: "Conn 1",
        standard: "edfi",
        baseUrl: "https://sis.myschool.edu/c1",
        credentialRef: "KEY_1",
      });

      const req = new Request("http://localhost/api/sis/connectors");
      const res = await getConnectors(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.connectors).toHaveLength(1);
      expect(json.connectors[0].name).toBe("Conn 1");
      expect(json.connectors[0].credentialRef).toBeUndefined();
    });
  });

  describe("Connector Test Endpoint", () => {
    it("verifies connectivity and SSRF compliance", async () => {
      const conn = await ConnectorRegistry.createConnector(tenantA, {
        name: "Testable Hub",
        standard: "edfi",
        baseUrl: "https://sis.myschool.edu/api",
        credentialRef: "TEST_KEY",
      });

      const req = new Request(`http://localhost/api/sis/connectors/${conn.id}/test`, {
        method: "POST",
      });

      const res = await testConnector(req, { params: Promise.resolve({ id: conn.id }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.pinnedIp).toBe("93.184.216.34");
    });
  });

  describe("Sync Run Trigger & Concurrency Endpoint", () => {
    it("triggers a sync run and enforces 409 Conflict with Retry-After on concurrent trigger (Gate 17)", async () => {
      const conn = await ConnectorRegistry.createConnector(tenantA, {
        name: "Sync Hub",
        standard: "edfi",
        baseUrl: "https://sis.myschool.edu/api",
        credentialRef: "SYNC_KEY",
      });

      // 1. First trigger -> 202 Accepted
      const req1 = new Request(`http://localhost/api/sis/connectors/${conn.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full" }),
      });

      const res1 = await triggerSync(req1, { params: Promise.resolve({ id: conn.id }) });
      expect(res1.status).toBe(202);
      const json1 = await res1.json();
      expect(json1.run.status).toBe("running");

      // 2. Concurrent trigger -> 409 Conflict + Retry-After
      const req2 = new Request(`http://localhost/api/sis/connectors/${conn.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "delta" }),
      });

      const res2 = await triggerSync(req2, { params: Promise.resolve({ id: conn.id }) });
      expect(res2.status).toBe(409);
      expect(res2.headers.get("Retry-After")).toBe("60");

      const json2 = await res2.json();
      expect(json2.error).toContain("already in progress");
      expect(json2.activeRunId).toBe(json1.run.id);
    });

    it("lists runs and gets run details", async () => {
      const conn = await ConnectorRegistry.createConnector(tenantA, {
        name: "Runs Hub",
        standard: "edfi",
        baseUrl: "https://sis.myschool.edu/api",
        credentialRef: "RUN_KEY",
      });

      const run = await SyncRunEngine.triggerRun(tenantA, conn.id, { mode: "full" });

      // List runs
      const listReq = new Request(`http://localhost/api/sis/runs?connectorId=${conn.id}`);
      const listRes = await getRuns(listReq);
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.runs).toHaveLength(1);
      expect(listJson.runs[0].id).toBe(run.id);

      // Get single run
      const getReq = new Request(`http://localhost/api/sis/runs/${run.id}`);
      const getRes = await getRunById(getReq, { params: Promise.resolve({ id: run.id }) });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.run.id).toBe(run.id);
    });
  });
});
