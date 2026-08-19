import { EventBus } from "../observability/event-bus";
import { SSEManager } from "../observability/sse-manager";
import { MetricsAggregator } from "../observability/metrics-aggregator";
import { db } from "../../db";
import { swarmEvents, swarmMetrics } from "../../db/schema";
import { eq } from "drizzle-orm";

describe("Observability Foundation", () => {
  beforeEach(async () => {
    // Clear test tables before each run to ensure isolated tests
    try {
      await db.delete(swarmEvents).run();
      await db.delete(swarmMetrics).run();
    } catch (err) {
      // Ignore schema issues in untransacted sqlite
    }
  });

  test("EventBus ring-buffer storage", () => {
    const bus = EventBus.getInstance();
    bus.setFilters({ minSeverity: "info", metricsEnabled: true });

    bus.publishEvent({
      eventSource: "test-source",
      severity: "info",
      message: "Hello info"
    });

    bus.publishMetric({
      nodeId: "test-node",
      metricName: "test_metric",
      metricValue: 42
    });

    const buffer = bus.getRingBuffer();
    expect(buffer.length).toBeGreaterThanOrEqual(2);
    
    const event = buffer.find((e) => e.type === "event" && e.data.eventSource === "test-source");
    const metric = buffer.find((m) => m.type === "metric" && m.data.metricName === "test_metric");

    expect(event).toBeDefined();
    expect(metric).toBeDefined();
    if (event && event.type === "event") {
      expect(event.data.message).toBe("Hello info");
    }
    if (metric && metric.type === "metric") {
      expect(metric.data.metricValue).toBe(42);
    }
  });

  test("EventBus severity filters", () => {
    const bus = EventBus.getInstance();
    bus.setFilters({ minSeverity: "error" });
    
    const initialLen = bus.getRingBuffer().length;

    bus.publishEvent({
      eventSource: "test-source",
      severity: "info",
      message: "Ignored info"
    });

    expect(bus.getRingBuffer().length).toBe(initialLen);

    bus.publishEvent({
      eventSource: "test-source",
      severity: "error",
      message: "Logged error"
    });

    expect(bus.getRingBuffer().length).toBe(initialLen + 1);
  });

  test("EventBus database flush batching", async () => {
    const bus = EventBus.getInstance();
    bus.setFilters({ minSeverity: "info", metricsEnabled: true });

    bus.publishEvent({
      eventSource: "batch-test",
      severity: "info",
      message: "Flushed event"
    });
    
    await bus.flush();

    const dbEvents = await db.select().from(swarmEvents).where(eq(swarmEvents.eventSource, "batch-test")).all();
    expect(dbEvents.length).toBe(1);
    expect(dbEvents[0].message).toBe("Flushed event");
  });

  test("SSEManager client stream dispatch", () => {
    const sse = SSEManager.getInstance();
    
    const mockController = {
      enqueue: jest.fn(),
      close: jest.fn()
    } as unknown as ReadableStreamDefaultController;

    const registered = sse.registerConnection(mockController);
    expect(registered).toBe(true);

    sse.broadcast({
      type: "event",
      data: {
        id: "test_sse",
        eventSource: "test",
        severity: "info",
        message: "Broadcast test",
        timestamp: new Date().toISOString()
      }
    });

    expect(mockController.enqueue).toHaveBeenCalled();
    sse.removeConnection(mockController);
  });

  test("MetricsAggregator time-series rollups", async () => {
    await db.insert(swarmMetrics).values([
      {
        id: "m_test1",
        nodeId: "node-A",
        metricName: "latency",
        metricValue: 10,
        timestamp: new Date().toISOString()
      },
      {
        id: "m_test2",
        nodeId: "node-A",
        metricName: "latency",
        metricValue: 20,
        timestamp: new Date().toISOString()
      }
    ]).run();

    await MetricsAggregator.aggregate();

    const averages = await db
      .select()
      .from(swarmMetrics)
      .where(eq(swarmMetrics.metricName, "latency_avg_1m"))
      .all();

    expect(averages.length).toBe(1);
    expect(averages[0].metricValue).toBe(15); // Average of 10 and 20
  });
});
