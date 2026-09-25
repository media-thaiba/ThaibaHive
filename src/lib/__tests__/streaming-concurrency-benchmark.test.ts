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
});
