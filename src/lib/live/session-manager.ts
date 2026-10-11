import { db } from "@/db";
import {
  agentLiveSessions,
  agentLiveSessionSegments,
} from "@/db/schema";
import { eq, and, sql, desc, gte, lt } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  LiveSessionProvider,
  createLiveSessionProvider,
  LiveTranscriptSegment,
  LiveHazardEvent,
  LiveToolCall,
} from "./provider";
import { KeyframePipeline } from "./keyframe-pipeline";
import { VadTranscriber } from "./vad-transcriber";
import type { LiveSessionStartInput } from "@/lib/validation/schemas";

export interface ActiveSessionState {
  sessionRecord: any;
  provider: LiveSessionProvider;
  keyframePipeline: KeyframePipeline;
  vadTranscriber: VadTranscriber;
  subscribers: Set<(event: string, data: any) => void>;
  startedAt: number;
  maxDurationMs: number;
  durationTimer: NodeJS.Timeout | null;
  sequenceCounter: number;
}

export class LiveSessionManager {
  private static instance: LiveSessionManager;
  private activeSessions = new Map<string, ActiveSessionState>();
  private maxConcurrentPerTenant = 3;
  private dailyQuotaMinutes = 120; // 2 hours max daily per institution

  public static getInstance(): LiveSessionManager {
    if (!LiveSessionManager.instance) {
      LiveSessionManager.instance = new LiveSessionManager();
    }
    return LiveSessionManager.instance;
  }

  public setDailyQuotaMinutes(minutes: number): void {
    this.dailyQuotaMinutes = minutes;
  }

  public setMaxConcurrentPerTenant(limit: number): void {
    this.maxConcurrentPerTenant = limit;
  }

  public getActiveSessionCount(institutionId?: string): number {
    if (!institutionId) return this.activeSessions.size;
    let count = 0;
    for (const state of this.activeSessions.values()) {
      if (state.sessionRecord.institutionId === institutionId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check daily session-minutes quota for an institution.
   */
  public async getDailyUsageSeconds(institutionId: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const rows = await db
      .select({
        totalSecs: sql<number>`coalesce(sum(${agentLiveSessions.totalSeconds}), 0)`,
      })
      .from(agentLiveSessions)
      .where(
        and(
          eq(agentLiveSessions.institutionId, institutionId),
          gte(agentLiveSessions.startedAt, todayStart.toISOString())
        )
      );

    return Number(rows[0]?.totalSecs ?? 0);
  }

  /**
   * Start a new Live Multimodal Session with quota & concurrency checks.
   */
  public async startSession(
    institutionId: string,
    input: Partial<LiveSessionStartInput>,
    userId?: string
  ): Promise<any> {
    // 1. Concurrency Check
    const activeTenantCount = this.getActiveSessionCount(institutionId);
    if (activeTenantCount >= this.maxConcurrentPerTenant) {
      throw new Error(
        `Maximum concurrent live sessions reached for this institution (${this.maxConcurrentPerTenant} max).`
      );
    }

    // 2. Daily Quota Check
    const dailySecondsUsed = await this.getDailyUsageSeconds(institutionId);
    if (dailySecondsUsed >= this.dailyQuotaMinutes * 60) {
      throw new Error(
        `Daily live session quota exceeded for this institution (${this.dailyQuotaMinutes} minutes/day).`
      );
    }

    const sessionId = randomUUID();
    const now = new Date().toISOString();
    const maxDurationSeconds = input.maxDurationSeconds || 900;

    const newSession = {
      id: sessionId,
      institutionId,
      sessionType: input.sessionType || "cctv_analysis",
      cameraZoneId: input.cameraZoneId || null,
      modelId: input.modelId || "gemini-3.8-live",
      status: "active",
      keyframeIntervalSeconds: input.keyframeIntervalSeconds || 1,
      maxDurationSeconds,
      totalSeconds: 0,
      totalFrames: 0,
      totalTokens: 0,
      startedBy: userId || null,
      startedAt: now,
      endedAt: null,
    };

    await db.insert(agentLiveSessions).values(newSession);

    // 3. Initialize Provider and Pipelines
    const subscribers = new Set<(event: string, data: any) => void>();
    let sequenceCounter = 0;

    const provider = createLiveSessionProvider({
      sessionId,
      institutionId,
      modelId: input.modelId,
      systemInstruction: input.systemInstruction,
      onTranscript: async (segment: LiveTranscriptSegment) => {
        sequenceCounter++;
        await this.recordSegment(sessionId, institutionId, sequenceCounter, "transcript", segment);
        this.broadcast(sessionId, "transcript", segment);
      },
      onHazard: async (hazard: LiveHazardEvent) => {
        sequenceCounter++;
        await this.recordSegment(sessionId, institutionId, sequenceCounter, "hazard", hazard);
        this.broadcast(sessionId, "hazard", hazard);
      },
      onToolCall: async (toolCall: LiveToolCall) => {
        sequenceCounter++;
        await this.recordSegment(sessionId, institutionId, sequenceCounter, "tool_call", toolCall);
        this.broadcast(sessionId, "tool_call", toolCall);
      },
      onStatusChange: (status) => {
        this.broadcast(sessionId, "status", { status });
      },
      onError: (err) => {
        this.broadcast(sessionId, "error", { message: err.message });
      },
    });

    await provider.connect();

    const keyframePipeline = new KeyframePipeline(provider, {
      intervalSeconds: input.keyframeIntervalSeconds,
    });
    const vadTranscriber = new VadTranscriber();

    // 4. Setup max duration expiry timer
    const maxDurationMs = maxDurationSeconds * 1000;
    const durationTimer = setTimeout(async () => {
      try {
        await this.endSession(sessionId, institutionId, "expired");
      } catch {}
    }, maxDurationMs);

    const state: ActiveSessionState = {
      sessionRecord: newSession,
      provider,
      keyframePipeline,
      vadTranscriber,
      subscribers,
      startedAt: Date.now(),
      maxDurationMs,
      durationTimer,
      sequenceCounter,
    };

    this.activeSessions.set(sessionId, state);
    return newSession;
  }

  /**
   * Ingest multimodal events (audio chunks, keyframes, text).
   */
  public async ingestEvent(
    sessionId: string,
    institutionId: string,
    event: {
      type: "audio" | "keyframe" | "text";
      pcm16Base64?: string;
      jpegBase64?: string;
      mimeType?: string;
      text?: string;
    }
  ): Promise<{ success: boolean; droppedOldest?: boolean }> {
    const state = this.activeSessions.get(sessionId);
    if (!state || state.sessionRecord.institutionId !== institutionId) {
      throw new Error("Active session not found.");
    }

    if (event.type === "audio" && event.pcm16Base64) {
      state.vadTranscriber.processChunk(event.pcm16Base64);
      await state.provider.sendAudioChunk(event.pcm16Base64);

      // Increment totalSeconds and totalTokens approximation
      await db
        .update(agentLiveSessions)
        .set({
          totalSeconds: sql`${agentLiveSessions.totalSeconds} + 1`,
          totalTokens: sql`${agentLiveSessions.totalTokens} + 32`,
        })
        .where(eq(agentLiveSessions.id, sessionId));

      return { success: true };
    }

    if (event.type === "keyframe" && event.jpegBase64) {
      const result = await state.keyframePipeline.ingestFrame(
        event.jpegBase64,
        event.mimeType || "image/jpeg"
      );

      // Single-statement atomic frame counter increment
      await db
        .update(agentLiveSessions)
        .set({
          totalFrames: sql`${agentLiveSessions.totalFrames} + 1`,
        })
        .where(eq(agentLiveSessions.id, sessionId));

      return { success: true, droppedOldest: result.droppedOldest };
    }

    if (event.type === "text" && event.text) {
      await state.provider.sendText(event.text);
      return { success: true };
    }

    return { success: false };
  }

  /**
   * Subscribe to real-time SSE event stream for a session.
   */
  public subscribe(
    sessionId: string,
    institutionId: string,
    listener: (event: string, data: any) => void
  ): () => void {
    const state = this.activeSessions.get(sessionId);
    if (!state || state.sessionRecord.institutionId !== institutionId) {
      throw new Error("Active session not found.");
    }

    state.subscribers.add(listener);
    return () => {
      state.subscribers.delete(listener);
    };
  }

  public broadcast(sessionId: string, event: string, data: any): void {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    for (const listener of state.subscribers) {
      try {
        listener(event, data);
      } catch {}
    }
  }

  private async recordSegment(
    sessionId: string,
    institutionId: string,
    sequence: number,
    segmentType: "transcript" | "hazard" | "tool_call",
    payload: any
  ): Promise<void> {
    try {
      await db.insert(agentLiveSessionSegments).values({
        id: randomUUID(),
        institutionId,
        sessionId,
        sequence,
        segmentType,
        payloadJson: JSON.stringify(payload),
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[LiveSessionManager] Failed to record segment:", err);
    }
  }

  /**
   * End / terminate an active live session.
   */
  public async endSession(
    sessionId: string,
    institutionId: string,
    status: "completed" | "terminated" | "expired" | "failed" = "completed"
  ): Promise<any> {
    const state = this.activeSessions.get(sessionId);
    if (state && state.durationTimer) {
      clearTimeout(state.durationTimer);
    }

    if (state) {
      await state.provider.disconnect();
      this.broadcast(sessionId, "session_ended", { status, sessionId });
      this.activeSessions.delete(sessionId);
    }

    const now = new Date().toISOString();
    await db
      .update(agentLiveSessions)
      .set({
        status,
        endedAt: now,
      })
      .where(
        and(
          eq(agentLiveSessions.id, sessionId),
          eq(agentLiveSessions.institutionId, institutionId)
        )
      );

    const rows = await db
      .select()
      .from(agentLiveSessions)
      .where(eq(agentLiveSessions.id, sessionId))
      .limit(1);

    return rows[0] || null;
  }

  /**
   * Get session details with recent segments.
   */
  public async getSession(
    sessionId: string,
    institutionId: string
  ): Promise<any | null> {
    const rows = await db
      .select()
      .from(agentLiveSessions)
      .where(
        and(
          eq(agentLiveSessions.id, sessionId),
          eq(agentLiveSessions.institutionId, institutionId)
        )
      )
      .limit(1);

    if (rows.length === 0) return null;

    const segments = await db
      .select()
      .from(agentLiveSessionSegments)
      .where(eq(agentLiveSessionSegments.sessionId, sessionId))
      .orderBy(agentLiveSessionSegments.sequence);

    return {
      ...rows[0],
      segments: segments.map((s) => ({
        ...s,
        payload: JSON.parse(s.payloadJson),
      })),
    };
  }

  /**
   * List live sessions for an institution.
   */
  public async listSessions(
    institutionId: string,
    filters?: { status?: string; sessionType?: string }
  ): Promise<any[]> {
    const conditions = [eq(agentLiveSessions.institutionId, institutionId)];

    if (filters?.status) {
      conditions.push(eq(agentLiveSessions.status, filters.status));
    }
    if (filters?.sessionType) {
      conditions.push(eq(agentLiveSessions.sessionType, filters.sessionType));
    }

    return await db
      .select()
      .from(agentLiveSessions)
      .where(and(...conditions))
      .orderBy(desc(agentLiveSessions.startedAt));
  }

  /**
   * Data Retention Purge: Delete segments older than specified days.
   */
  public async purgeExpiredSegments(
    institutionId?: string,
    olderThanDays: number = 90
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 86400 * 1000).toISOString();
    const conditions = [lt(agentLiveSessionSegments.createdAt, cutoffDate)];

    if (institutionId) {
      conditions.push(eq(agentLiveSessionSegments.institutionId, institutionId));
    }

    const result = await db
      .delete(agentLiveSessionSegments)
      .where(and(...conditions));

    return (result as any)?.changes ?? 0;
  }
}

export const liveSessionManager = LiveSessionManager.getInstance();
