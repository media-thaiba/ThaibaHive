import { POST } from "../../app/api/mobile/v1/sync/push/route";
import zlib from "zlib";
import { EventBus } from "../observability/event-bus";

describe("Mobile Sync Push Route Integration", () => {
  const mockMutation = {
    id: "mut_001",
    mutationType: "CREATE",
    entityType: "attendance",
    payload: { status: "present" },
    clientTimestamp: new Date().toISOString(),
  };

  const mockPayload = {
    deviceId: "device-test-123",
    mutations: [mockMutation],
    diagnostics: {
      connectionType: "wifi",
      latencyMs: 15,
      bandwidthKbps: 12000,
      compressionStats: {
        rawBytes: 500,
        compressedBytes: 150,
        compressionRatio: 0.70,
      },
    },
  };

  test("Should parse and process uncompressed sync payload", async () => {
    const request = new Request("http://localhost/api/mobile/v1/sync/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.deviceId).toBe("device-test-123");
    expect(body.processedCount).toBe(1);
  });

  test("Should parse and decompress gzip sync payload", async () => {
    const payloadBuffer = Buffer.from(JSON.stringify(mockPayload), "utf-8");
    const gzipBuffer = zlib.gzipSync(payloadBuffer);

    const request = new Request("http://localhost/api/mobile/v1/sync/push", {
      method: "POST",
      headers: {
        "Content-Encoding": "gzip",
        "Content-Length": gzipBuffer.length.toString(),
      },
      body: gzipBuffer.toString("binary"),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.deviceId).toBe("device-test-123");
    expect(body.processedCount).toBe(1);
  });

  test("Should reject payload exceeding compressed size limit (2MB)", async () => {
    const hugeBuffer = Buffer.alloc(1024 * 1024 * 3); // 3MB

    const request = new Request("http://localhost/api/mobile/v1/sync/push", {
      method: "POST",
      headers: {
        "Content-Encoding": "gzip",
        "Content-Length": hugeBuffer.length.toString(),
      },
      body: hugeBuffer.toString("binary"),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);

    const body = await response.json();
    expect(body.error).toContain("limit exceeded");
  });

  test("Should reject payload triggering zip bomb threshold (5MB decompressed)", async () => {
    // Generate a payload that decompresses to >5MB but is small compressed (like repeated zeros)
    const zeroBuffer = Buffer.alloc(1024 * 1024 * 6); // 6MB raw
    const gzipBuffer = zlib.gzipSync(zeroBuffer); // highly compressible

    const request = new Request("http://localhost/api/mobile/v1/sync/push", {
      method: "POST",
      headers: {
        "Content-Encoding": "gzip",
        "Content-Length": gzipBuffer.length.toString(),
      },
      body: gzipBuffer.toString("binary"),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);

    const body = await response.json();
    expect(body.error).toContain("decompressed limit exceeded");
  });

  test("Should capture mobile telemetry metrics and trigger anomaly on low savings", async () => {
    // 1. Submit a payload with low savings ratio (e.g. 10%)
    const lowSavingsPayload = {
      deviceId: "device-anomaly-999",
      mutations: [mockMutation],
      diagnostics: {
        connectionType: "wifi",
        latencyMs: 120,
        bandwidthKbps: 8000,
        compressionStats: {
          rawBytes: 1000,
          compressedBytes: 900,
          compressionRatio: 0.10, // 10% savings is below the 40% threshold!
        },
      },
    };

    const payloadBuffer = Buffer.from(JSON.stringify(lowSavingsPayload), "utf-8");
    const gzipBuffer = zlib.gzipSync(payloadBuffer);

    const request = new Request("http://localhost/api/mobile/v1/sync/push", {
      method: "POST",
      headers: {
        "Content-Encoding": "gzip",
        "Content-Length": gzipBuffer.length.toString(),
      },
      body: gzipBuffer.toString("binary"),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify metrics and anomaly events are recorded in EventBus
    const bus = EventBus.getInstance();
    const ringBuffer = bus.getRingBuffer();

    const lowSavingsWarning = ringBuffer.find(
      (e) => e.type === "event" && e.data.message.includes("Low Compression Ratio Anomaly") && e.data.message.includes("device-anomaly-999")
    );
    expect(lowSavingsWarning).toBeDefined();

    const latencyMetric = ringBuffer.find(
      (e) => e.type === "metric" && e.data.metricName === "mobile_sync_latency_ms" && e.data.nodeId === "device-anomaly-999"
    );
    expect(latencyMetric).toBeDefined();
    if (latencyMetric && latencyMetric.type === "metric") {
      expect(latencyMetric.data.metricValue).toBe(120);
    }
  });
});
