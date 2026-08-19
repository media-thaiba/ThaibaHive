export interface StreamSession {
  sessionId: string;
  tenantId: string;
  userId: string;
  connectionType: "websocket" | "sse";
  channels: string[];
  status: "active" | "disconnected" | "closed";
  lastPingAt: string;
  createdAt: string;
}

export interface StreamEventFrame {
  eventId: string;
  tenantId: string;
  channel: string;
  eventType: string;
  payload: Record<string, any>;
  sequenceNumber: number;
  timestamp: string;
}

export class RealTimeStreamingService {
  private sessions = new Map<string, StreamSession>();
  private messageReplayBuffer = new Map<string, StreamEventFrame[]>(); // key: tenant:channel
  private sequenceCounter = new Map<string, number>();

  createSession(
    tenantId: string,
    userId: string,
    connectionType: "websocket" | "sse" = "websocket",
    channels: string[] = ["copilot_feed", "risk_alerts"]
  ): StreamSession {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const session: StreamSession = {
      sessionId,
      tenantId,
      userId,
      connectionType,
      channels,
      status: "active",
      lastPingAt: now,
      createdAt: now,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  pingSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.lastPingAt = new Date().toISOString();
    session.status = "active";
    return true;
  }

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = "closed";
    return this.sessions.delete(sessionId);
  }

  getActiveSessions(tenantId?: string): StreamSession[] {
    const active = Array.from(this.sessions.values()).filter((s) => s.status === "active");
    if (!tenantId) return active;
    return active.filter((s) => s.tenantId === tenantId);
  }

  publishEvent(
    tenantId: string,
    channel: string,
    eventType: string,
    payload: Record<string, any>
  ): StreamEventFrame {
    const bufferKey = `${tenantId}:${channel}`;
    const currentSeq = (this.sequenceCounter.get(bufferKey) || 0) + 1;
    this.sequenceCounter.set(bufferKey, currentSeq);

    const eventId = `evt_${tenantId}_${Date.now()}_${currentSeq}`;
    const frame: StreamEventFrame = {
      eventId,
      tenantId,
      channel,
      eventType,
      payload,
      sequenceNumber: currentSeq,
      timestamp: new Date().toISOString(),
    };

    if (!this.messageReplayBuffer.has(bufferKey)) {
      this.messageReplayBuffer.set(bufferKey, []);
    }
    const buf = this.messageReplayBuffer.get(bufferKey)!;
    buf.push(frame);
    if (buf.length > 100) {
      buf.shift(); // Keep last 100 frames for replay
    }

    return frame;
  }

  getReplayEvents(tenantId: string, channel: string, lastEventId?: string): StreamEventFrame[] {
    const bufferKey = `${tenantId}:${channel}`;
    const buf = this.messageReplayBuffer.get(bufferKey) || [];
    if (!lastEventId) return buf;

    const idx = buf.findIndex((f) => f.eventId === lastEventId);
    if (idx === -1) return buf;
    return buf.slice(idx + 1);
  }

  clear(): void {
    this.sessions.clear();
    this.messageReplayBuffer.clear();
    this.sequenceCounter.clear();
  }
}

export const defaultStreamingService = new RealTimeStreamingService();
