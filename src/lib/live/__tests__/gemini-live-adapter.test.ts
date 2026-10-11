import { LiveSessionManager } from "../session-manager";
import { MockLiveProvider, createLiveSessionProvider } from "../provider";
import { KeyframePipeline, KeyframeQueue } from "../keyframe-pipeline";
import { VadTranscriber } from "../vad-transcriber";
import { db } from "@/db";
import {
  agentLiveSessions,
  agentLiveSessionSegments,
  institutions,
  staff,
} from "@/db/schema";
import { inArray, eq } from "drizzle-orm";

describe("Gemini Live Multimodal Adapter & Session Engine", () => {
  const ts = Date.now();
  const tenantA = `inst_live_a_${ts}`;
  const tenantB = `inst_live_b_${ts}`;
  const testStaffId = `usr_live_staff_${ts}`;
  const manager = LiveSessionManager.getInstance();

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: tenantA, name: "Live Session Campus A", code: `lsa_${ts}` },
      { id: tenantB, name: "Live Session Campus B", code: `lsb_${ts}` },
    ]);

    await db.insert(staff).values([
      {
        id: testStaffId,
        email: `livestaff_${ts}@test.com`,
        employeeId: `emp_live_${ts}`,
        firstName: "Live",
        lastName: "Operator",
        role: "admin",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(agentLiveSessionSegments).where(inArray(agentLiveSessionSegments.institutionId, [tenantA, tenantB]));
    await db.delete(agentLiveSessions).where(inArray(agentLiveSessions.institutionId, [tenantA, tenantB]));
    await db.delete(staff).where(eq(staff.id, testStaffId));
    await db.delete(institutions).where(inArray(institutions.id, [tenantA, tenantB]));
  });

  describe("MockLiveProvider Lifecycle & Streaming Events", () => {
    it("connects, processes audio chunks, keyframes, and text messages", async () => {
      const transcripts: any[] = [];
      const hazards: any[] = [];

      const provider = new MockLiveProvider({
        sessionId: `test_sess_${ts}`,
        institutionId: tenantA,
        modelId: "gemini-3.8-live",
        onTranscript: (seg) => transcripts.push(seg),
        onHazard: (haz) => hazards.push(haz),
      });

      expect(provider.getStatus()).toBe("closed");
      await provider.connect();
      expect(provider.getStatus()).toBe("active");
      expect(transcripts.length).toBeGreaterThan(0);
      expect(transcripts[0].speaker).toBe("system");

      // Send 3 audio chunks to trigger transcript emission
      const dummyPcm = Buffer.alloc(3200).toString("base64"); // 100ms PCM16
      await provider.sendAudioChunk(dummyPcm);
      await provider.sendAudioChunk(dummyPcm);
      await provider.sendAudioChunk(dummyPcm);

      expect(transcripts.some((t) => t.speaker === "user")).toBe(true);
      expect(transcripts.some((t) => t.speaker === "agent")).toBe(true);

      // Send keyframes to trigger hazard analysis
      const dummyJpeg = Buffer.alloc(1024).toString("base64");
      await provider.sendKeyframe(dummyJpeg);
      await provider.sendKeyframe(dummyJpeg); // Frame 2 triggers simulated hazard

      expect(hazards.length).toBe(1);
      expect(hazards[0].hazardType).toBe("unauthorized_entry");
      expect(hazards[0].confidence).toBeGreaterThan(0.8);

      // Send text
      await provider.sendText("Please report corridor status");
      expect(transcripts.some((t) => t.text.includes("Corridor status") || t.text.includes("corridor status"))).toBe(true);

      await provider.disconnect();
      expect(provider.getStatus()).toBe("closed");
    });

    it("handles simulated WebSocket errors with exponential backoff reconnect", async () => {
      const statusChanges: string[] = [];

      const provider = new MockLiveProvider({
        sessionId: `test_reconnect_${ts}`,
        institutionId: tenantA,
        onStatusChange: (s) => statusChanges.push(s),
      });

      await provider.connect();
      expect(provider.getStatus()).toBe("active");

      // Trigger error #1 (reconnects)
      await provider.triggerMockError("Socket dropped");
      expect(provider.getReconnectAttempts()).toBe(1);
      expect(provider.getStatus()).toBe("active");
      expect(statusChanges).toContain("reconnecting");
    });
  });

  describe("Keyframe Bounded Queue & Drop-Oldest Strategy", () => {
    it("drops oldest frames when bounded queue capacity is exceeded", () => {
      const queue = new KeyframeQueue(3); // capacity 3
      expect(queue.size()).toBe(0);

      const f1 = { jpegBase64: "frame1", mimeType: "image/jpeg", timestamp: 1 };
      const f2 = { jpegBase64: "frame2", mimeType: "image/jpeg", timestamp: 2 };
      const f3 = { jpegBase64: "frame3", mimeType: "image/jpeg", timestamp: 3 };
      const f4 = { jpegBase64: "frame4", mimeType: "image/jpeg", timestamp: 4 };

      expect(queue.enqueue(f1)).toBe(false);
      expect(queue.enqueue(f2)).toBe(false);
      expect(queue.enqueue(f3)).toBe(false);
      expect(queue.size()).toBe(3);

      // 4th frame should drop oldest (f1)
      const dropped = queue.enqueue(f4);
      expect(dropped).toBe(true);
      expect(queue.size()).toBe(3);
      expect(queue.getDroppedCount()).toBe(1);

      // Verify oldest remaining frame is f2
      expect(queue.peek()?.jpegBase64).toBe("frame2");
    });

    it("processes frames through KeyframePipeline into provider", async () => {
      const provider = new MockLiveProvider({
        sessionId: `pipeline_sess_${ts}`,
        institutionId: tenantA,
      });
      await provider.connect();

      const pipeline = new KeyframePipeline(provider, { queueCapacity: 4 });
      const res = await pipeline.ingestFrame(Buffer.alloc(512).toString("base64"));
      expect(res.queued).toBe(true);
      expect(pipeline.getTotalFramesProcessed()).toBe(1);
    });
  });

  describe("VadTranscriber Energy Detection", () => {
    it("computes RMS and detects voice activity above threshold", () => {
      const vad = new VadTranscriber({ energyThreshold: 0.05 });

      // Silent buffer
      const silentBuf = Buffer.alloc(1600 * 2); // 1600 zeroes
      const silentRes = vad.processChunk(silentBuf.toString("base64"));
      expect(silentRes.isVoiceActive).toBe(false);
      expect(silentRes.rms).toBe(0);

      // Active voice buffer with alternating samples
      const loudBuf = Buffer.alloc(1600 * 2);
      for (let i = 0; i < 1600; i++) {
        loudBuf.writeInt16LE(15000, i * 2);
      }

      const loudRes = vad.processChunk(loudBuf.toString("base64"));
      expect(loudRes.isVoiceActive).toBe(true);
      expect(loudRes.rms).toBeGreaterThan(0.4);
    });
  });

  describe("LiveSessionManager Multi-Tenant Orchestration & Quotas", () => {
    it("starts session, handles real-time events, and records segments in DB", async () => {
      const session = await manager.startSession(
        tenantA,
        {
          sessionType: "cctv_analysis",
          modelId: "gemini-3.8-live",
          maxDurationSeconds: 600,
        },
        testStaffId
      );

      expect(session.id).toBeDefined();
      expect(session.status).toBe("active");
      expect(session.institutionId).toBe(tenantA);

      // Ingest audio event
      const dummyPcm = Buffer.alloc(3200).toString("base64");
      const audioRes = await manager.ingestEvent(session.id, tenantA, {
        type: "audio",
        pcm16Base64: dummyPcm,
      });
      expect(audioRes.success).toBe(true);

      // Ingest keyframe event
      const dummyJpeg = Buffer.alloc(1024).toString("base64");
      const keyframeRes = await manager.ingestEvent(session.id, tenantA, {
        type: "keyframe",
        jpegBase64: dummyJpeg,
      });
      expect(keyframeRes.success).toBe(true);

      // Retrieve session details and segments
      const details = await manager.getSession(session.id, tenantA);
      expect(details).not.toBeNull();
      expect(details.totalFrames).toBeGreaterThanOrEqual(1);
      expect(details.segments.length).toBeGreaterThanOrEqual(1);

      // End session
      const ended = await manager.endSession(session.id, tenantA, "completed");
      expect(ended.status).toBe("completed");
      expect(ended.endedAt).toBeDefined();
    });

    it("enforces concurrent session limit per tenant", async () => {
      manager.setMaxConcurrentPerTenant(2);

      const s1 = await manager.startSession(tenantB, { sessionType: "cctv_analysis" });
      const s2 = await manager.startSession(tenantB, { sessionType: "operator_console" });

      // 3rd concurrent session attempt MUST be rejected
      await expect(
        manager.startSession(tenantB, { sessionType: "cctv_analysis" })
      ).rejects.toThrow(/Maximum concurrent live sessions reached/);

      // Clean up
      await manager.endSession(s1.id, tenantB);
      await manager.endSession(s2.id, tenantB);
      manager.setMaxConcurrentPerTenant(3);
    });

    it("purges expired segments per retention policy", async () => {
      const purged = await manager.purgeExpiredSegments(tenantA, 90);
      expect(purged).toBeGreaterThanOrEqual(0);
    });
  });
});
