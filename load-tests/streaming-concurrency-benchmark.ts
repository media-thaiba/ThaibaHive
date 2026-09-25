#!/usr/bin/env tsx
/**
 * Real-Time Streaming & SSE Concurrency Benchmark Runner
 * Measures connection handshake latency, event throughput, heartbeat resilience, and recovery.
 */

import { performance } from "perf_hooks";
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/db";
import { staff } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { GET as realtimeEventsHandler } from "../src/app/api/realtime/events/route";
import { GET as visionStreamHandler } from "../src/app/api/vision/stream/route";
import { GET as workspacesSseHandler } from "../src/app/api/workspaces/sse/route";
import { VisionStreamManager } from "../src/lib/operations/vision/streaming/vision-stream-manager";
import { sendToConnection } from "../src/lib/api/realtime";

Object.defineProperty(process.env, "NODE_ENV", { value: "test", writable: true, configurable: true, enumerable: true });
process.env.SSE_HEARTBEAT_INTERVAL_MS = "400";

export interface StreamBenchmarkMetric {
  endpoint: string;
  concurrency: number;
  durationMs: number;
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  totalEventsReceived: number;
  totalHeartbeatsReceived: number;
  eventsPerSecond: number;
  handshakeLatency: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    minMs: number;
    maxMs: number;
    avgMs: number;
  };
}

export interface StreamingBenchmarkReport {
  timestamp: string;
  totalEndpoints: number;
  concurrencyPerEndpoint: number;
  durationPerEndpointSec: number;
  metrics: StreamBenchmarkMetric[];
  allPassed: boolean;
}

async function readChunkWithAbort(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal
): Promise<{ done: boolean; value?: Uint8Array }> {
  if (signal.aborted) return { done: true, value: undefined };
  return Promise.race([
    reader.read(),
    new Promise<{ done: true; value: undefined }>((resolve) => {
      signal.addEventListener("abort", () => resolve({ done: true, value: undefined }), { once: true });
    }),
  ]);
}

export async function runHandlerStreamBenchmark(
  name: string,
  handler: (req: Request) => Promise<Response>,
  url: string,
  concurrency = 50,
  durationMs = 2000,
  onStreamActive?: () => () => void
): Promise<StreamBenchmarkMetric> {
  const handshakeLatencies: number[] = [];
  let successful = 0;
  let failed = 0;
  let totalEvents = 0;
  let totalHeartbeats = 0;

  const startTime = performance.now();
  let stopBroadcasting: (() => void) | undefined;

  if (onStreamActive) {
    stopBroadcasting = onStreamActive();
  }

  const subscriberPromises = Array.from({ length: concurrency }).map(async () => {
    const reqStart = performance.now();
    const abortController = new AbortController();

    try {
      const req = new Request(url, {
        headers: {
          Accept: "text/event-stream",
          Authorization: "Bearer mock_test_token",
          Cookie: "thaibahive_session=mock_test_token",
        },
        signal: abortController.signal,
      });
      if (!req.signal) {
        Object.defineProperty(req, "signal", { value: abortController.signal });
      }

      const response = await handler(req);
      const reqEnd = performance.now();

      if (response.status === 200 && response.body) {
        successful++;
        handshakeLatencies.push(reqEnd - reqStart);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const timeout = setTimeout(() => {
          abortController.abort();
          try {
            reader.cancel();
          } catch {}
        }, durationMs);

        try {
          while (!abortController.signal.aborted && performance.now() - startTime < durationMs + 1000) {
            const { done, value } = await readChunkWithAbort(reader, abortController.signal);
            if (done || !value) break;

            const text = decoder.decode(value, { stream: true });
            if (text.includes("ping") || text.includes(": ping")) {
              totalHeartbeats++;
            }
            if (text.includes("data:") || text.includes("event:")) {
              totalEvents++;
            }
          }
        } catch {
          // Stream aborted normally
        } finally {
          clearTimeout(timeout);
          try {
            reader.releaseLock();
          } catch {}
        }
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  });

  await Promise.allSettled(subscriberPromises);
  if (stopBroadcasting) {
    stopBroadcasting();
  }

  const totalDuration = performance.now() - startTime;

  handshakeLatencies.sort((a, b) => a - b);
  const len = handshakeLatencies.length;

  const p50Ms = len > 0 ? handshakeLatencies[Math.floor(len * 0.5)] : 0;
  const p95Ms = len > 0 ? handshakeLatencies[Math.floor(len * 0.95)] : 0;
  const p99Ms = len > 0 ? handshakeLatencies[Math.floor(len * 0.99)] : 0;
  const minMs = len > 0 ? handshakeLatencies[0] : 0;
  const maxMs = len > 0 ? handshakeLatencies[len - 1] : 0;
  const avgMs = len > 0 ? handshakeLatencies.reduce((s, v) => s + v, 0) / len : 0;

  const eventsPerSecond = totalDuration > 0 ? Math.round((totalEvents / (totalDuration / 1000)) * 100) / 100 : 0;

  return {
    endpoint: name,
    concurrency,
    durationMs: Math.round(totalDuration),
    totalConnections: concurrency,
    successfulConnections: successful,
    failedConnections: failed,
    totalEventsReceived: totalEvents,
    totalHeartbeatsReceived: totalHeartbeats,
    eventsPerSecond,
    handshakeLatency: {
      p50Ms: Math.round(p50Ms * 100) / 100,
      p95Ms: Math.round(p95Ms * 100) / 100,
      p99Ms: Math.round(p99Ms * 100) / 100,
      minMs: Math.round(minMs * 100) / 100,
      maxMs: Math.round(maxMs * 100) / 100,
      avgMs: Math.round(avgMs * 100) / 100,
    },
  };
}

export async function ensureBenchmarkStaff() {
  const existing = await db.select().from(staff).where(eq(staff.id, "staff_admin_01")).get();
  if (!existing) {
    await db.insert(staff).values({
      id: "staff_admin_01",
      email: "admin@thaiba.edu",
      role: "super_admin",
      employeeId: "EMP001",
      firstName: "Test",
      lastName: "Admin",
      isActive: true,
      tokenVersion: 0,
      isFirstLogin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

async function main() {
  console.log("================================================================================");
  console.log("        THAIBAHIVE REAL-TIME STREAMING & SSE CONCURRENCY BENCHMARK              ");
  console.log("================================================================================");
  console.log(`Concurrency: 50 VUs per stream | Duration: 2s per stream | Timestamp: ${new Date().toISOString()}\n`);

  await ensureBenchmarkStaff();

  const endpoints = [
    {
      name: "/api/realtime/events",
      handler: realtimeEventsHandler,
      url: "http://localhost:3000/api/realtime/events",
      onActive: undefined,
    },
    {
      name: "/api/vision/stream",
      handler: visionStreamHandler,
      url: "http://localhost:3000/api/vision/stream?tenantId=global&topics=*",
      onActive: () => {
        const interval = setInterval(() => {
          VisionStreamManager.getInstance().broadcast("alpr", {
            plate: "KL-10-AZ-9999",
            confidence: 0.98,
            timestamp: Date.now(),
          });
        }, 100);
        return () => clearInterval(interval);
      },
    },
    {
      name: "/api/workspaces/sse",
      handler: workspacesSseHandler,
      url: "http://localhost:3000/api/workspaces/sse",
      onActive: () => {
        const interval = setInterval(() => {
          sendToConnection("workspace-staff_admin_01", "workspace_updated", {
            workspaceId: "ws_01",
            updatedAt: new Date().toISOString(),
          });
        }, 100);
        return () => clearInterval(interval);
      },
    },
  ];

  const metrics: StreamBenchmarkMetric[] = [];

  for (const ep of endpoints) {
    console.log(`⏳ Benchmarking ${ep.name} with 50 concurrent subscribers...`);
    const metric = await runHandlerStreamBenchmark(ep.name, ep.handler, ep.url, 50, 2000, ep.onActive);
    metrics.push(metric);

    console.log(`  ✅ Connections: ${metric.successfulConnections}/${metric.totalConnections} successful (${metric.failedConnections} failed)`);
    console.log(`  ✅ Handshake Latency: p50 = ${metric.handshakeLatency.p50Ms}ms, p95 = ${metric.handshakeLatency.p95Ms}ms, max = ${metric.handshakeLatency.maxMs}ms`);
    console.log(`  ✅ Event Delivery: ${metric.totalEventsReceived} events (${metric.eventsPerSecond} events/sec), ${metric.totalHeartbeatsReceived} heartbeats\n`);
  }

  const report: StreamingBenchmarkReport = {
    timestamp: new Date().toISOString(),
    totalEndpoints: metrics.length,
    concurrencyPerEndpoint: 50,
    durationPerEndpointSec: 2,
    metrics,
    allPassed: metrics.every((m) => m.successfulConnections === 50),
  };

  const reportPath = path.resolve(process.cwd(), "reports/streaming-benchmark-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`================================================================================`);
  console.log(`Benchmark Complete! Report saved to: ${reportPath}`);
  console.log(`All Endpoints Passed 50 VU Concurrency: ${report.allPassed ? "YES (100%)" : "NO"}`);
  console.log(`================================================================================`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
}
