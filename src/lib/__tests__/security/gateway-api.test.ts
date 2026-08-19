/**
 * Integration Tests for Gateway Security API Routes
 * Sprint-038 / AGS-012
 */

import { GET as getStats } from "../../../app/api/admin/security/gateway/stats/route";
import {
  GET as getQuarantines,
  POST as createQuarantine,
  DELETE as deleteQuarantine,
} from "../../../app/api/admin/security/gateway/quarantines/route";
import { POST as overrideBreaker } from "../../../app/api/admin/security/gateway/override/route";
import { QuarantineManager } from "../../security/quarantine-manager";
import { GatewayCircuitBreaker } from "../../security/circuit-breaker";

jest.mock("../../../../packages/auth", () => ({
  verifySession: jest.fn().mockResolvedValue({
    userId: "admin-1",
    email: "admin@thaibahive.org",
    role: "super_admin",
    permissions: ["system:security:view", "system:security:manage"],
  }),
  hasPermission: jest.fn().mockReturnValue(true),
}));

describe("Gateway API Routes (AGS-012)", () => {
  beforeEach(() => {
    QuarantineManager.getInstance().reset();
    GatewayCircuitBreaker.getInstance().reset();
  });

  it("GET /stats should return real-time gateway statistics", async () => {
    const req = new Request("http://localhost/api/admin/security/gateway/stats", {
      headers: { authorization: "Bearer mock-token" },
    });
    const res = await getStats(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.circuitBreakerState).toBe("CLOSED");
    expect(data.totalRequestsTracked).toBeDefined();
    expect(data.health).toBeDefined();
  });

  it("POST & DELETE /quarantines should manage IP bans", async () => {
    // 1. Create Quarantine
    const postReq = new Request("http://localhost/api/admin/security/gateway/quarantines", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer mock-token",
      },
      body: JSON.stringify({
        ipAddress: "198.51.100.55",
        reason: "Repeated DPoP replay injection",
        durationMinutes: 30,
      }),
    });

    const createRes = await createQuarantine(postReq);
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    expect(createData.quarantine.ipAddress).toBe("198.51.100.55");

    // 2. Query Quarantines
    const getReq = new Request("http://localhost/api/admin/security/gateway/quarantines", {
      headers: { authorization: "Bearer mock-token" },
    });
    const getRes = await getQuarantines(getReq);
    const getData = await getRes.json();
    expect(getData.total).toBe(1);

    // 3. Delete Quarantine
    const deleteReq = new Request("http://localhost/api/admin/security/gateway/quarantines?ip=198.51.100.55", {
      method: "DELETE",
      headers: { authorization: "Bearer mock-token" },
    });
    const deleteRes = await deleteQuarantine(deleteReq);
    expect(deleteRes.status).toBe(200);
    expect(QuarantineManager.getInstance().isBanned("198.51.100.55")).toBe(false);
  });

  it("POST /quarantines should reject invalid input with 400", async () => {
    const invalidReq = new Request("http://localhost/api/admin/security/gateway/quarantines", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer mock-token",
      },
      body: JSON.stringify({
        ipAddress: "",
        reason: "no",
      }),
    });

    const res = await createQuarantine(invalidReq);
    expect(res.status).toBe(400);
  });

  it("DELETE /quarantines should return 404 for non-existent IP", async () => {
    const deleteReq = new Request("http://localhost/api/admin/security/gateway/quarantines?ip=10.0.0.99", {
      method: "DELETE",
      headers: { authorization: "Bearer mock-token" },
    });
    const res = await deleteQuarantine(deleteReq);
    expect(res.status).toBe(404);
  });

  it("POST /override should trip and reset circuit breaker", async () => {
    const tripReq = new Request("http://localhost/api/admin/security/gateway/override", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer mock-token",
      },
      body: JSON.stringify({ action: "TRIP", reason: "Simulated load test" }),
    });

    const tripRes = await overrideBreaker(tripReq);
    expect(tripRes.status).toBe(200);
    const tripData = await tripRes.json();
    expect(tripData.state).toBe("OPEN");

    const resetReq = new Request("http://localhost/api/admin/security/gateway/override", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer mock-token",
      },
      body: JSON.stringify({ action: "RESET" }),
    });

    const resetRes = await overrideBreaker(resetReq);
    const resetData = await resetRes.json();
    expect(resetData.state).toBe("CLOSED");
  });

  it("POST /override should reject invalid action with 400", async () => {
    const invalidReq = new Request("http://localhost/api/admin/security/gateway/override", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: "Bearer mock-token",
      },
      body: JSON.stringify({ action: "INVALID" }),
    });

    const res = await overrideBreaker(invalidReq);
    expect(res.status).toBe(400);
  });
});
