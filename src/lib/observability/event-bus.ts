import { db } from "../../db";
import { swarmEvents, swarmMetrics } from "../../db/schema";

export interface TelemetryEvent {
  id: string;
  eventSource: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  timestamp: string;
}

export interface TelemetryMetric {
  id: string;
  nodeId: string;
  metricName: string;
  metricValue: number;
  timestamp: string;
}

export type ObservabilityEvent =
  | { type: "event"; data: TelemetryEvent }
  | { type: "metric"; data: TelemetryMetric };

export class EventBus {
  private static instance: EventBus;
  private ringBuffer: ObservabilityEvent[] = [];
  private readonly bufferSize = 1000;

  // Batching properties
  private pendingEvents: TelemetryEvent[] = [];
  private pendingMetrics: TelemetryMetric[] = [];
  private readonly batchSize = 100;
  private flushTimeout: NodeJS.Timeout | null = null;

  // Filtering configuration
  private minSeverity: "info" | "warning" | "error" | "critical" = "info";
  private metricsEnabled = true;

  private listeners: Set<(event: ObservabilityEvent) => void> = new Set();

  private constructor() {
    this.resetFlushTimer();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  subscribe(listener: (event: ObservabilityEvent) => void): () => void {
    this.listeners.add(listener);
    // Replay ring buffer to subscriber for startup sync
    for (const event of this.ringBuffer) {
      listener(event);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  setFilters(config: { minSeverity?: "info" | "warning" | "error" | "critical"; metricsEnabled?: boolean }) {
    if (config.minSeverity) this.minSeverity = config.minSeverity;
    if (config.metricsEnabled !== undefined) this.metricsEnabled = config.metricsEnabled;
  }

  private shouldEmitEvent(severity: string): boolean {
    const severities = ["info", "warning", "error", "critical"];
    const minIndex = severities.indexOf(this.minSeverity);
    const eventIndex = severities.indexOf(severity);
    return eventIndex >= minIndex;
  }

  publishEvent(event: Omit<TelemetryEvent, "id" | "timestamp">) {
    if (!this.shouldEmitEvent(event.severity)) return;

    const fullEvent: TelemetryEvent = {
      ...event,
      id: "evt_" + Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
    };

    const obsEvent: ObservabilityEvent = { type: "event", data: fullEvent };
    this.addToRingBuffer(obsEvent);
    this.listeners.forEach((listener) => {
      try {
        listener(obsEvent);
      } catch (err) {
        console.error("[EventBus] Failed to notify subscriber:", err);
      }
    });

    this.pendingEvents.push(fullEvent);
    if (this.pendingEvents.length + this.pendingMetrics.length >= this.batchSize) {
      this.flush().catch((err) => console.error("[EventBus] Flush error:", err));
    }
  }

  publishMetric(metric: Omit<TelemetryMetric, "id" | "timestamp">) {
    if (!this.metricsEnabled) return;

    const fullMetric: TelemetryMetric = {
      ...metric,
      id: "met_" + Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
    };

    const obsEvent: ObservabilityEvent = { type: "metric", data: fullMetric };
    this.addToRingBuffer(obsEvent);
    this.listeners.forEach((listener) => {
      try {
        listener(obsEvent);
      } catch (err) {
        console.error("[EventBus] Failed to notify subscriber:", err);
      }
    });

    this.pendingMetrics.push(fullMetric);
    if (this.pendingEvents.length + this.pendingMetrics.length >= this.batchSize) {
      this.flush().catch((err) => console.error("[EventBus] Flush error:", err));
    }
  }

  private addToRingBuffer(event: ObservabilityEvent) {
    this.ringBuffer.push(event);
    if (this.ringBuffer.length > this.bufferSize) {
      this.ringBuffer.shift();
    }
  }

  private resetFlushTimer() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    // Automatically flush every 5 seconds to bound memory growth
    this.flushTimeout = setTimeout(() => {
      this.flush().catch((err) => console.error("[EventBus] Async flush error:", err));
    }, 5000);
  }

  async flush() {
    this.resetFlushTimer();

    const eventsToFlush = this.pendingEvents.splice(0);
    const metricsToFlush = this.pendingMetrics.splice(0);

    if (eventsToFlush.length === 0 && metricsToFlush.length === 0) return;

    try {
      await db.transaction(async (tx: any) => {
        if (eventsToFlush.length > 0) {
          await tx.insert(swarmEvents).values(eventsToFlush).run();
        }
        if (metricsToFlush.length > 0) {
          await tx.insert(swarmMetrics).values(metricsToFlush).run();
        }
      });
    } catch (err) {
      console.error("[EventBus] Failed to flush telemetry batch to database:", err);
    }
  }

  getRingBuffer(): ObservabilityEvent[] {
    return this.ringBuffer;
  }
}
