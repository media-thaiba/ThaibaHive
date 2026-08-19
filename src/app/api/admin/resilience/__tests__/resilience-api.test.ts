jest.mock("../../../../../../packages/auth/session", () => ({
  verifySession: async () => ({ staffId: "user-admin", role: "admin", email: "admin@thaiba.edu" }),
}));

import { GET as indexGET, POST as indexPOST } from "../index-tuning/route";
import { GET as cbGET, POST as cbPOST } from "../circuit-breaker/route";
import { GET as dlqGET, POST as dlqPOST } from "../dlq-retry/route";

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

describe("FED-009: Self-Healing Infrastructure API Route Handlers Test Suite", () => {
  it("interacts with index tuning API via /api/admin/resilience/index-tuning", async () => {
    const getReq = createMockRequest("http://localhost/api/admin/resilience/index-tuning", "GET");
    const getRes = await indexGET(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.recommendations).toBeDefined();

    const postReq = createMockRequest("http://localhost/api/admin/resilience/index-tuning", "POST", { action: "analyze" });
    const postRes = await indexPOST(postReq);
    expect(postRes.status).toBe(200);
  });

  it("trips and resets circuit breaker via /api/admin/resilience/circuit-breaker", async () => {
    const getReq = createMockRequest("http://localhost/api/admin/resilience/circuit-breaker", "GET");
    const getRes = await cbGET(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.circuitState.state).toBe("CLOSED");

    const tripReq = createMockRequest("http://localhost/api/admin/resilience/circuit-breaker", "POST", { action: "trip" });
    const tripRes = await cbPOST(tripReq);
    expect(tripRes.status).toBe(200);

    const resetReq = createMockRequest("http://localhost/api/admin/resilience/circuit-breaker", "POST", { action: "reset" });
    const resetRes = await cbPOST(resetReq);
    expect(resetRes.status).toBe(200);
  });

  it("inspects and manages DLQ retries via /api/admin/resilience/dlq-retry", async () => {
    const getReq = createMockRequest("http://localhost/api/admin/resilience/dlq-retry", "GET");
    const getRes = await dlqGET(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.jobs).toBeDefined();
  });
});
