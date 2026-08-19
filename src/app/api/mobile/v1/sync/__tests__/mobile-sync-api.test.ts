import { POST as pushPOST } from "../push/route";
import { GET as pullGET } from "../pull/route";

function createMockRequest(url: string, method: string = "GET", body?: any): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("FED-014: Mobile Offline Sync API Route Handlers Test Suite", () => {
  it("processes push sync mutations via POST /api/mobile/v1/sync/push", async () => {
    const req = createMockRequest("http://localhost/api/mobile/v1/sync/push", "POST", {
      deviceId: "device-test-99",
      mutations: [
        {
          id: "mut-batch-1",
          mutationType: "CREATE",
          entityType: "student_attendance",
          payload: { studentId: "std-77", status: "present" },
          clientTimestamp: new Date().toISOString(),
        },
      ],
    });

    const res = await pushPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processedCount).toBe(1);
    expect(data.results[0].status).toBe("SYNCED");
  });

  it("returns server deltas via GET /api/mobile/v1/sync/pull", async () => {
    const req = createMockRequest("http://localhost/api/mobile/v1/sync/pull?since=2026-08-01T00:00:00Z", "GET");
    const res = await pullGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.deltas).toBeDefined();
    expect(data.serverTimestamp).toBeDefined();
  });
});
