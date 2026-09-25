/**
 * Real-Time Streaming & SSE Concurrency Integration Tests
 * Validates concurrent stream subscriptions, handshake frames, event broadcasting, and cleanup.
 */

import { GET as realtimeEventsHandler } from "@/app/api/realtime/events/route";
import { GET as visionStreamHandler } from "@/app/api/vision/stream/route";
import { GET as workspacesSseHandler } from "@/app/api/workspaces/sse/route";
import { VisionStreamManager } from "@/lib/operations/vision/streaming/vision-stream-manager";
import { sendToConnection } from "@/lib/api/realtime";
import { db } from "@/db";
import { staff } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

describe("Real-Time Streaming & Concurrency Benchmark Tests", () => {
  beforeAll(async () => {
    // Ensure test staff user exists for realtime verification
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
  });

  it("handles 10 concurrent subscribers to /api/realtime/events and receives initial frame", async () => {
    const concurrency = 10;
    const subscriberPromises = Array.from({ length: concurrency }).map(async () => {
      const ac = new AbortController();
      const req = new Request("http://localhost:3000/api/realtime/events", {
        headers: {
          Accept: "text/event-stream",
          Authorization: "Bearer mock_token",
        },
        signal: ac.signal,
      });

      const res = await realtimeEventsHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      const { value, done } = await reader.read();
      expect(done).toBe(false);

      const text = decoder.decode(value);
      expect(text).toContain("connected");
      expect(text).toContain("staff_admin_01");

      ac.abort();
      reader.releaseLock();
    });

    await Promise.all(subscriberPromises);
  });

  it("handles 10 concurrent subscribers to /api/vision/stream and broadcasts live telemetry", async () => {
    const concurrency = 10;
    const subscribers: { reader: ReadableStreamDefaultReader<Uint8Array>; ac: AbortController }[] = [];

    // Step 1: Connect all subscribers and verify initial frame
    for (let i = 0; i < concurrency; i++) {
      const ac = new AbortController();
      const req = new Request("http://localhost:3000/api/vision/stream?tenantId=global&topics=*", {
        headers: {
          Accept: "text/event-stream",
          Authorization: "Bearer mock_token",
        },
        signal: ac.signal,
      });

      const res = await visionStreamHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      const firstChunk = await reader.read();
      expect(firstChunk.done).toBe(false);
      const firstText = decoder.decode(firstChunk.value);
      expect(firstText).toContain("connected");

      subscribers.push({ reader, ac });
    }

    // Step 2: Broadcast an ALPR event to all connected subscribers
    const broadcastCount = VisionStreamManager.getInstance().broadcast("alpr", {
      plate: "KL-10-TEST-001",
      confidence: 0.99,
    });
    expect(broadcastCount).toBeGreaterThanOrEqual(concurrency);

    // Step 3: Verify all subscribers receive the broadcast frame
    const decoder = new TextDecoder();
    for (const sub of subscribers) {
      const secondChunk = await sub.reader.read();
      expect(secondChunk.done).toBe(false);
      const secondText = decoder.decode(secondChunk.value);
      expect(secondText).toContain("KL-10-TEST-001");

      sub.ac.abort();
      sub.reader.releaseLock();
    }
  });

  it("handles 10 concurrent subscribers to /api/workspaces/sse and broadcasts workspace updates", async () => {
    const concurrency = 10;
    const subscribers: { reader: ReadableStreamDefaultReader<Uint8Array>; ac: AbortController }[] = [];

    // Step 1: Connect all subscribers and verify initial frame
    for (let i = 0; i < concurrency; i++) {
      const ac = new AbortController();
      const req = new Request("http://localhost:3000/api/workspaces/sse", {
        headers: {
          Accept: "text/event-stream",
          Authorization: "Bearer mock_token",
        },
        signal: ac.signal,
      });

      const res = await workspacesSseHandler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      const firstChunk = await reader.read();
      expect(firstChunk.done).toBe(false);
      const firstText = decoder.decode(firstChunk.value);
      expect(firstText).toContain("connected");

      subscribers.push({ reader, ac });
    }

    // Step 2: Broadcast a workspace update to all subscribers
    sendToConnection("workspace-staff_admin_01", "workspace_sync", {
      workspaceId: "ws_benchmark_test",
      status: "active",
    });

    // Step 3: Verify all subscribers receive the workspace update frame
    const decoder = new TextDecoder();
    for (const sub of subscribers) {
      const secondChunk = await sub.reader.read();
      expect(secondChunk.done).toBe(false);
      const secondText = decoder.decode(secondChunk.value);
      expect(secondText).toContain("ws_benchmark_test");

      sub.ac.abort();
      sub.reader.releaseLock();
    }
  });

  it("handles pre-aborted requests cleanly across all endpoints without leaking registrations", async () => {
    const initialVisionClients = VisionStreamManager.getInstance().getActiveClientCount();

    const ac = new AbortController();
    ac.abort(); // Pre-aborted

    // 1. Pre-aborted /api/vision/stream
    const visionReq = new Request("http://localhost:3000/api/vision/stream?tenantId=global&topics=*", {
      headers: { Accept: "text/event-stream", Authorization: "Bearer mock_token" },
    });
    Object.defineProperty(visionReq, "signal", { value: ac.signal });

    const visionRes = await visionStreamHandler(visionReq);
    expect(visionRes.status).toBe(200);
    const visionReader = visionRes.body!.getReader();
    const visionChunk = await visionReader.read();
    expect(visionChunk.done).toBe(true);
    visionReader.releaseLock();
    expect(VisionStreamManager.getInstance().getActiveClientCount()).toBe(initialVisionClients);

    // 2. Pre-aborted /api/workspaces/sse
    const wsReq = new Request("http://localhost:3000/api/workspaces/sse", {
      headers: { Accept: "text/event-stream", Authorization: "Bearer mock_token" },
    });
    Object.defineProperty(wsReq, "signal", { value: ac.signal });

    const wsRes = await workspacesSseHandler(wsReq);
    expect(wsRes.status).toBe(200);
    const wsReader = wsRes.body!.getReader();
    const wsChunk = await wsReader.read();
    expect(wsChunk.done).toBe(true);
    wsReader.releaseLock();

    // 3. Pre-aborted /api/realtime/events
    const rtReq = new Request("http://localhost:3000/api/realtime/events", {
      headers: { Accept: "text/event-stream", Authorization: "Bearer mock_token" },
    });
    Object.defineProperty(rtReq, "signal", { value: ac.signal });

    const rtRes = await realtimeEventsHandler(rtReq);
    expect(rtRes.status).toBe(200);
    const rtReader = rtRes.body!.getReader();
    const rtChunk = await rtReader.read();
    expect(rtChunk.done).toBe(true);
    rtReader.releaseLock();
  });

  it("handles reader.cancel() and unregisters active stream listeners", async () => {
    const initialVisionClients = VisionStreamManager.getInstance().getActiveClientCount();

    // Connect vision stream
    const req = new Request("http://localhost:3000/api/vision/stream?tenantId=global&topics=*", {
      headers: { Accept: "text/event-stream", Authorization: "Bearer mock_token" },
    });
    const res = await visionStreamHandler(req);
    expect(res.status).toBe(200);
    expect(VisionStreamManager.getInstance().getActiveClientCount()).toBe(initialVisionClients + 1);

    const reader = res.body!.getReader();
    const firstChunk = await reader.read();
    expect(firstChunk.done).toBe(false);

    // Cancel reader
    await reader.cancel();
    reader.releaseLock();

    // Verify subscriber was unregistered from VisionStreamManager
    expect(VisionStreamManager.getInstance().getActiveClientCount()).toBe(initialVisionClients);
  });

  it("receives and decodes heartbeat ping frames over SSE", async () => {
    process.env.SSE_HEARTBEAT_INTERVAL_MS = "100";

    const ac = new AbortController();
    const req = new Request("http://localhost:3000/api/workspaces/sse", {
      headers: { Accept: "text/event-stream", Authorization: "Bearer mock_token" },
      signal: ac.signal,
    });

    const res = await workspacesSseHandler(req);
    expect(res.status).toBe(200);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // Initial frame
    const firstChunk = await reader.read();
    expect(firstChunk.done).toBe(false);

    // Wait for heartbeat
    await new Promise((r) => setTimeout(r, 150));
    const pingChunk = await reader.read();
    expect(pingChunk.done).toBe(false);
    const pingText = decoder.decode(pingChunk.value);
    expect(pingText).toContain(": ping");

    ac.abort();
    reader.releaseLock();
  });
});
