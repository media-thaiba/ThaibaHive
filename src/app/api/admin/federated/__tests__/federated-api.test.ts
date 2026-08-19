jest.mock("../../../../../../packages/auth/session", () => ({
  verifySession: async () => ({ staffId: "user-admin", role: "admin", email: "admin@thaiba.edu" }),
}));

import { GET as policiesGET, POST as policiesPOST } from "../policies/route";
import { GET as auditGET, POST as auditPOST } from "../audit-logs/route";
import { GET as mappingsGET, POST as mappingsPOST } from "../role-mappings/route";

function createMockRequest(url: string, method: string = "GET", body?: any): Request {
  const headers = new Headers();
  headers.set("authorization", "Bearer mock-token");
  headers.set("x-user-role", "admin");

  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("FED-005: Federated Governance API Route Handlers Test Suite", () => {
  it("creates and lists federated policies via /api/admin/federated/policies", async () => {
    const postReq = createMockRequest("http://localhost/api/admin/federated/policies", "POST", {
      title: "Regional Financial Governance Standard",
      category: "finance",
      content: { auditIntervalMonths: 6, maxUnbudgetedExpense: 5000 },
      status: "DRAFT",
    });

    const postRes = await policiesPOST(postReq);
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.policy.title).toBe("Regional Financial Governance Standard");

    const getReq = createMockRequest("http://localhost/api/admin/federated/policies", "GET");
    const getRes = await policiesGET(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.policies.length).toBeGreaterThan(0);
  });

  it("records and queries federated audit logs via /api/admin/federated/audit-logs", async () => {
    const postReq = createMockRequest("http://localhost/api/admin/federated/audit-logs", "POST", {
      action: "RESERVE_BUDGET",
      actorId: "admin-user-99",
      severity: "AUDIT",
      details: { amount: 12000, departmentId: "dept-cs" },
    });

    const postRes = await auditPOST(postReq);
    expect(postRes.status).toBe(201);

    const getReq = createMockRequest("http://localhost/api/admin/federated/audit-logs", "GET");
    const getRes = await auditGET(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.logs.length).toBeGreaterThan(0);
  });

  it("creates and lists cross-tenant role mappings via /api/admin/federated/role-mappings", async () => {
    const postReq = createMockRequest("http://localhost/api/admin/federated/role-mappings", "POST", {
      sourceTenantId: "campus-north",
      targetTenantId: "campus-south",
      sourceRole: "principal",
      targetRole: "regional_admin",
      permissions: ["federated:policies", "federated:audit", "resilience:manage"],
    });

    const postRes = await mappingsPOST(postReq);
    expect(postRes.status).toBe(201);

    const getReq = createMockRequest("http://localhost/api/admin/federated/role-mappings", "GET");
    const getRes = await mappingsGET(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.mappings.length).toBeGreaterThan(0);
  });
});
