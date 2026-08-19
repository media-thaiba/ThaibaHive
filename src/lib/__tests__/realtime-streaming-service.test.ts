

import { RealTimeStreamingService } from "../realtime/realtime-streaming-service";
import { formatSSEEvent, formatSSEResponse, getSSEHeaders } from "../realtime/sse-handler";

describe("STREAM-004: Dual-Channel Real-Time Streaming & SSE Fallback Service", () => {
  let streamingService: RealTimeStreamingService;

  beforeEach(() => {
    streamingService = new RealTimeStreamingService();
  });

  it("creates and tracks active streaming sessions", () => {
    const sess1 = streamingService.createSession("tenant-1", "user-100", "websocket", ["copilot_feed"]);
    const sess2 = streamingService.createSession("tenant-1", "user-101", "sse", ["risk_alerts"]);

    expect(sess1.connectionType).toBe("websocket");
    expect(sess2.connectionType).toBe("sse");

    const active = streamingService.getActiveSessions("tenant-1");
    expect(active.length).toBe(2);
  });

  it("publishes event frames with sequential eventIds and buffers replay frames", () => {
    streamingService.publishEvent("tenant-1", "copilot_feed", "recommendation_created", { title: "Rec 1" });
    const f2 = streamingService.publishEvent("tenant-1", "copilot_feed", "recommendation_created", { title: "Rec 2" });

    expect(f2.sequenceNumber).toBe(2);
    expect(f2.eventId).toContain("evt_tenant-1");

    const replayAll = streamingService.getReplayEvents("tenant-1", "copilot_feed");
    expect(replayAll.length).toBe(2);
  });

  it("replays only missing events after lastEventId", () => {
    const f1 = streamingService.publishEvent("tenant-1", "risk_alerts", "absenteeism_flag", { studentId: "s1" });
    const f2 = streamingService.publishEvent("tenant-1", "risk_alerts", "absenteeism_flag", { studentId: "s2" });

    const missed = streamingService.getReplayEvents("tenant-1", "risk_alerts", f1.eventId);
    expect(missed.length).toBe(1);
    expect(missed[0].eventId).toBe(f2.eventId);
  });

  it("formats Server-Sent Event text payloads and headers", () => {
    const frame = streamingService.publishEvent("tenant-1", "copilot_feed", "alert", { message: "High risk" });
    const headers = getSSEHeaders();

    expect(headers["Content-Type"]).toBe("text/event-stream");

    const formatted = formatSSEEvent(frame);
    expect(formatted).toContain(`id: ${frame.eventId}`);
    expect(formatted).toContain("event: copilot_feed");
    expect(formatted).toContain('{"message":"High risk"}');

    const multi = formatSSEResponse([frame]);
    expect(multi).toBe(formatted);
  });
});
