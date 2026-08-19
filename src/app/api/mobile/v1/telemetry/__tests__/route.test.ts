import { POST } from "../route";
import { MobileSyncTelemetryAggregator } from "@/lib/observability/mobile-sync-telemetry-aggregator";
import { verifySession } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(() => true),
}));

describe("MOB-009: POST /api/mobile/v1/telemetry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MobileSyncTelemetryAggregator.getInstance().reset();
    delete process.env.MOBILE_TELEMETRY_ENABLED;
  });

  const validPayload = {
    deviceId: "device-test-uuid-123",
    appVersion: "1.0.0+14",
    events: [
      {
        id: "ev-001",
        batchSize: 15,
        syncDurationMs: 120.5,
        networkType: "wifi",
        retryCount: 0,
        conflictCount: 1,
        success: true,
      },
      {
        id: "ev-002",
        batchSize: 5,
        syncDurationMs: 340.0,
        networkType: "cellular",
        retryCount: 1,
        conflictCount: 0,
        success: true,
      },
    ],
  };

  test("returns 401 when session is not authenticated", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/mobile/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Not authenticated");
  });

  test("returns 200 OK and ingests valid telemetry batch when authenticated", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "stf-001",
      email: "staff@thaiba.local",
      role: "staff",
    });

    const req = new Request("http://localhost:3000/api/mobile/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ingestedEvents).toBe(2);
    expect(data.deviceId).toBe("device-test-uuid-123");

    const summary = MobileSyncTelemetryAggregator.getInstance().getSummary();
    expect(summary.totalBatches).toBe(2);
    expect(summary.totalMutations).toBe(20);
    expect(summary.totalConflicts).toBe(1);
    expect(summary.networkDistribution.wifi).toBe(1);
    expect(summary.networkDistribution.cellular).toBe(1);
    expect(summary.successRate).toBe(100);
  });

  test("returns 400 Bad Request on invalid payload structure", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "stf-001",
      role: "staff",
    });

    const req = new Request("http://localhost:3000/api/mobile/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "test",
        events: [], // min 1 required
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  test("returns 400 on malformed JSON body", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "stf-001",
      role: "staff",
    });

    const req = new Request("http://localhost:3000/api/mobile/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-a-valid-json{",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON request payload");
  });

  test("respects MOBILE_TELEMETRY_ENABLED=false kill-switch", async () => {
    process.env.MOBILE_TELEMETRY_ENABLED = "false";
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "stf-001",
      role: "staff",
    });

    const req = new Request("http://localhost:3000/api/mobile/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Mobile telemetry disabled");
    expect(data.ingestedEvents).toBe(0);

    const summary = MobileSyncTelemetryAggregator.getInstance().getSummary();
    expect(summary.totalBatches).toBe(0);
  });
});
