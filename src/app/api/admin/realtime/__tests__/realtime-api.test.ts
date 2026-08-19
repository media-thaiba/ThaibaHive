jest.mock("@thaiba/auth", () => ({
  verifySession: async () => ({ staffId: "user-admin", role: "super_admin", email: "admin@thaiba.edu" }),
  hasPermission: () => true,
}));


import { POST as streamPOST } from "../stream/route";
import { GET as sseGET } from "../sse/route";
import { GET as healthGET } from "../health/route";

function createMockRequest(url: string, method: string = "GET", body?: any, headers?: Record<string, string>): Request {
  const reqHeaders = new Headers(headers || {});
  reqHeaders.set("authorization", "Bearer mock-token");
  reqHeaders.set("x-user-role", "admin");

  return new Request(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("STREAM-005: Real-Time Streaming & Cluster Health API Handlers", () => {
  it("initializes streaming session via POST /api/admin/realtime/stream", async () => {
    const req = createMockRequest("http://localhost/api/admin/realtime/stream", "POST", {
      channels: ["copilot_feed", "risk_alerts"],
      connectionType: "sse",
    });

    const res = await streamPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.session).toBeDefined();
    expect(data.session.connectionType).toBe("sse");
  });

  it("subscribes to SSE event stream via GET /api/admin/realtime/sse", async () => {
    const req = createMockRequest("http://localhost/api/admin/realtime/sse?channel=copilot_feed", "GET");
    const res = await sseGET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("returns cluster health metrics via GET /api/admin/realtime/health", async () => {
    const req = createMockRequest("http://localhost/api/admin/realtime/health", "GET");
    const res = await healthGET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.clusterMetrics.activeNodes).toBe(3);
  });
});
