
import { realtimeStreamQuerySchema } from "../validation/schemas";
import { defaultStreamingService } from "../realtime/realtime-streaming-service";
import { formatSSEResponse, getSSEHeaders } from "../realtime/sse-handler";
import { defaultClusterManager } from "../redis/redis-cluster-manager";

describe("STREAM-005: Real-Time Streaming & Cluster Health Handler Integration", () => {
  it("initializes streaming session payload", () => {
    const parse = realtimeStreamQuerySchema.safeParse({
      channels: ["copilot_feed", "risk_alerts"],
      connectionType: "sse",
    });
    expect(parse.success).toBe(true);
    if (parse.success) {
      const session = defaultStreamingService.createSession("tenant-main", "user-admin", parse.data.connectionType, parse.data.channels);
      expect(session.sessionId).toBeDefined();
      expect(session.connectionType).toBe("sse");
    }
  });

  it("subscribes and formats SSE event stream headers and body", () => {
    const frame = defaultStreamingService.publishEvent("tenant-main", "copilot_feed", "alert", { text: "Insight ready" });
    const events = defaultStreamingService.getReplayEvents("tenant-main", "copilot_feed");
    expect(events.length).toBeGreaterThan(0);

    const headers = getSSEHeaders();
    expect(headers["Content-Type"]).toBe("text/event-stream");

    const sseBody = formatSSEResponse([frame]);
    expect(sseBody).toContain(`id: ${frame.eventId}`);
    expect(sseBody).toContain("event: copilot_feed");
  });

  it("retrieves cluster health metrics for health handler", async () => {
    const health = await defaultClusterManager.getClusterHealthMetrics();
    const activeSessions = defaultStreamingService.getActiveSessions();

    expect(health.activeNodes).toBe(3);
    expect(health.totalSlots).toBe(16384);
    expect(Array.isArray(activeSessions)).toBe(true);
  });
});
