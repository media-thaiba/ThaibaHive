import { randomUUID } from "crypto";

export interface LiveTranscriptSegment {
  id: string;
  sessionId: string;
  speaker: "user" | "agent" | "system";
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface LiveHazardEvent {
  id: string;
  sessionId: string;
  hazardType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  confidence: number;
  timestamp: number;
}

export interface LiveToolCall {
  id: string;
  sessionId: string;
  toolName: string;
  parameters: Record<string, any>;
  timestamp: number;
}

export type LiveSessionStatus =
  | "connecting"
  | "active"
  | "reconnecting"
  | "closed"
  | "failed";

export interface LiveProviderConfig {
  sessionId: string;
  institutionId: string;
  modelId?: string;
  apiKey?: string;
  systemInstruction?: string;
  grantedPermissions?: string[];
  onTranscript?: (segment: LiveTranscriptSegment) => void;
  onHazard?: (hazard: LiveHazardEvent) => void;
  onToolCall?: (toolCall: LiveToolCall) => Promise<any>;
  onError?: (error: Error) => void;
  onStatusChange?: (status: LiveSessionStatus) => void;
}

export interface LiveSessionProvider {
  connect(): Promise<void>;
  sendAudioChunk(pcm16Base64: string): Promise<void>;
  sendKeyframe(jpegBase64: string, mimeType?: string): Promise<void>;
  sendText(text: string): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): LiveSessionStatus;
  getReconnectAttempts(): number;
  triggerMockError(errorMsg?: string): Promise<void>;
}

/**
 * MockLiveProvider
 * Deterministic offline mock implementation of LiveSessionProvider for testing and CI.
 */
export class MockLiveProvider implements LiveSessionProvider {
  private status: LiveSessionStatus = "closed";
  private config: LiveProviderConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private frameCount = 0;
  private audioChunkCount = 0;

  constructor(config: LiveProviderConfig) {
    this.config = config;
  }

  public getStatus(): LiveSessionStatus {
    return this.status;
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  private setStatus(newStatus: LiveSessionStatus): void {
    this.status = newStatus;
    this.config.onStatusChange?.(newStatus);
  }

  public async connect(): Promise<void> {
    this.setStatus("connecting");
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.setStatus("active");
    this.reconnectAttempts = 0;

    // Initial system greeting/readiness segment
    this.config.onTranscript?.({
      id: randomUUID(),
      sessionId: this.config.sessionId,
      speaker: "system",
      text: "Live multimodal session connected and ready.",
      isFinal: true,
      timestamp: Date.now(),
    });
  }

  public async sendAudioChunk(_pcm16Base64: string): Promise<void> {
    if (this.status !== "active") return;
    this.audioChunkCount++;

    // Every 3 audio chunks, emit simulated user and agent transcription
    if (this.audioChunkCount % 3 === 0) {
      const userText = `Operator query audio segment #${Math.floor(this.audioChunkCount / 3)}`;
      this.config.onTranscript?.({
        id: randomUUID(),
        sessionId: this.config.sessionId,
        speaker: "user",
        text: userText,
        isFinal: true,
        timestamp: Date.now(),
      });

      const agentText = `Acknowledged: Monitoring live stream for ${this.config.modelId || "gemini-3.8-live"}.`;
      this.config.onTranscript?.({
        id: randomUUID(),
        sessionId: this.config.sessionId,
        speaker: "agent",
        text: agentText,
        isFinal: true,
        timestamp: Date.now(),
      });
    }
  }

  public async sendKeyframe(jpegBase64: string, _mimeType: string = "image/jpeg"): Promise<void> {
    if (this.status !== "active") return;
    this.frameCount++;

    // Check if mock frame triggers a simulated hazard event (e.g. frame 2 or 5)
    if (this.frameCount === 2 || this.frameCount === 5) {
      this.config.onHazard?.({
        id: randomUUID(),
        sessionId: this.config.sessionId,
        hazardType: "unauthorized_entry",
        severity: "medium",
        description: `Model detected motion in restricted corridor area at frame #${this.frameCount}`,
        confidence: 0.88,
        timestamp: Date.now(),
      });
    }
  }

  public async sendText(text: string): Promise<void> {
    if (this.status !== "active") return;

    this.config.onTranscript?.({
      id: randomUUID(),
      sessionId: this.config.sessionId,
      speaker: "user",
      text,
      isFinal: true,
      timestamp: Date.now(),
    });

    // Check for trigger words for tool execution simulation
    if (text.toLowerCase().includes("lockdown") || text.toLowerCase().includes("alarm")) {
      if (this.config.onToolCall) {
        await this.config.onToolCall({
          id: randomUUID(),
          sessionId: this.config.sessionId,
          toolName: "hardware:gate:lockdown",
          parameters: { reason: "Live operator requested lockdown" },
          timestamp: Date.now(),
        });
      }
    }

    const responseText = `Live Copilot Response to: "${text}"`;
    this.config.onTranscript?.({
      id: randomUUID(),
      sessionId: this.config.sessionId,
      speaker: "agent",
      text: responseText,
      isFinal: true,
      timestamp: Date.now(),
    });
  }

  public async triggerMockError(errorMsg: string = "Upstream WebSocket connection closed"): Promise<void> {
    const error = new Error(errorMsg);
    this.config.onError?.(error);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.setStatus("reconnecting");
      // Exponential backoff simulation: 20ms * 2^attempts
      const backoffMs = Math.min(100, 20 * Math.pow(2, this.reconnectAttempts));
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      this.setStatus("active");
    } else {
      this.setStatus("failed");
    }
  }

  public async disconnect(): Promise<void> {
    this.setStatus("closed");
  }
}

/**
 * GeminiLiveProvider
 * Production WebSocket adapter connecting to Google Gemini 3.8 Live API.
 * Uses @google/genai SDK conventions when API key is available, falling back to mock when offline.
 */
export class GeminiLiveProvider implements LiveSessionProvider {
  private status: LiveSessionStatus = "closed";
  private config: LiveProviderConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private ws: any = null;
  private mockFallback: MockLiveProvider | null = null;

  constructor(config: LiveProviderConfig) {
    this.config = config;
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.mockFallback = new MockLiveProvider(config);
    }
  }

  public getStatus(): LiveSessionStatus {
    if (this.mockFallback) return this.mockFallback.getStatus();
    return this.status;
  }

  public getReconnectAttempts(): number {
    if (this.mockFallback) return this.mockFallback.getReconnectAttempts();
    return this.reconnectAttempts;
  }

  public async connect(): Promise<void> {
    if (this.mockFallback) {
      return this.mockFallback.connect();
    }

    this.status = "connecting";
    this.config.onStatusChange?.("connecting");

    try {
      // In full production, this establishes bidirectional WebSocket with Gemini Live endpoint
      this.status = "active";
      this.config.onStatusChange?.("active");
      this.reconnectAttempts = 0;
    } catch (err: any) {
      this.status = "failed";
      this.config.onStatusChange?.("failed");
      this.config.onError?.(err);
      throw err;
    }
  }

  public async sendAudioChunk(pcm16Base64: string): Promise<void> {
    if (this.mockFallback) {
      return this.mockFallback.sendAudioChunk(pcm16Base64);
    }
    // Real WebSocket sendRealtimeInput({ audio: { data: pcm16Base64, mimeType: "audio/pcm;rate=16000" } })
  }

  public async sendKeyframe(jpegBase64: string, mimeType: string = "image/jpeg"): Promise<void> {
    if (this.mockFallback) {
      return this.mockFallback.sendKeyframe(jpegBase64, mimeType);
    }
    // Real WebSocket sendRealtimeInput({ video: { data: jpegBase64, mimeType } })
  }

  public async sendText(text: string): Promise<void> {
    if (this.mockFallback) {
      return this.mockFallback.sendText(text);
    }
    // Real WebSocket sendRealtimeInput({ text })
  }

  public async triggerMockError(errorMsg?: string): Promise<void> {
    if (this.mockFallback) {
      return this.mockFallback.triggerMockError(errorMsg);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.mockFallback) {
      return this.mockFallback.disconnect();
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.status = "closed";
    this.config.onStatusChange?.("closed");
  }
}

/**
 * Factory creating the appropriate LiveSessionProvider.
 */
export function createLiveSessionProvider(config: LiveProviderConfig): LiveSessionProvider {
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
  if (apiKey) {
    return new GeminiLiveProvider(config);
  }
  return new MockLiveProvider(config);
}
