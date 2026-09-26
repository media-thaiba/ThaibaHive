import { EventBus, ObservabilityEvent } from "./event-bus";
import zlib from "zlib";

export class SSEManager {
  private static instance: SSEManager;
  private connections: Set<ReadableStreamDefaultController> = new Set();
  private readonly maxConnections = 100;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeats();
    // Subscribe to EventBus to forward events to all open connections
    EventBus.getInstance().subscribe((event) => {
      this.broadcast(event);
    });
  }

  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  registerConnection(controller: ReadableStreamDefaultController): boolean {
    if (this.connections.size >= this.maxConnections) {
      try {
        controller.enqueue(
          new TextEncoder().encode(
            "event: error\ndata: " + JSON.stringify({ error: "Too many concurrent connections" }) + "\n\n"
          )
        );
        controller.close();
      } catch {
        // Ignore
      }
      return false;
    }

    this.connections.add(controller);
    
    // Send initial connection verification event
    this.sendToController(controller, {
      type: "event",
      data: {
        id: "sys_init",
        eventSource: "sse-manager",
        severity: "info",
        message: "SSE connection established successfully",
        timestamp: new Date().toISOString()
      }
    });

    return true;
  }

  removeConnection(controller: ReadableStreamDefaultController) {
    this.connections.delete(controller);
  }

  private startHeartbeats() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      const heartbeatData = new TextEncoder().encode(": keep-alive\n\n");
      this.connections.forEach((controller) => {
        try {
          controller.enqueue(heartbeatData);
        } catch {
          // Closed connection, clean it up
          this.removeConnection(controller);
        }
      });
    }, 15000);
  }

  broadcast(event: ObservabilityEvent) {
    const rawStr = JSON.stringify(event);
    const rawBytes = Buffer.byteLength(rawStr, "utf-8");
    
    // Safety check: protect against infinite loop of compression tracking metrics
    const isObservabilityMetric =
      event.type === "metric" && event.data.nodeId === "observability-node";

    if (!isObservabilityMetric && rawBytes > 0) {
      try {
        const compressed = zlib.gzipSync(rawStr);
        const compressedBytes = compressed.length;

        // Publish compression stats safely back to EventBus
        EventBus.getInstance().publishMetric({
          nodeId: "observability-node",
          metricName: "bandwidth_raw_bytes",
          metricValue: rawBytes,
        });

        EventBus.getInstance().publishMetric({
          nodeId: "observability-node",
          metricName: "bandwidth_compressed_bytes",
          metricValue: compressedBytes,
        });
      } catch {
        // Silently catch compression tracker errors to prevent stream drops
      }
    }

    const data = new TextEncoder().encode(`data: ${rawStr}\n\n`);
    this.connections.forEach((controller) => {
      try {
        controller.enqueue(data);
      } catch {
        this.removeConnection(controller);
      }
    });
  }

  private sendToController(controller: ReadableStreamDefaultController, event: ObservabilityEvent) {
    try {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch {
      this.removeConnection(controller);
    }
  }

  getActiveConnectionCount(): number {
    return this.connections.size;
  }
}
