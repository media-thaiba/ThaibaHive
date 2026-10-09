import { chatPubSub, ChatEvent } from "./pubsub-broker";

export type PresenceStatus = "online" | "away" | "offline";

export interface UserPresenceState {
  staffId: string;
  institutionId: string;
  status: PresenceStatus;
  lastHeartbeat: number;
}

export class ChatPresenceEngine {
  private static instance: ChatPresenceEngine;
  private presenceMap = new Map<string, UserPresenceState>();
  // Key: `${channelId}:${staffId}` -> Timer
  private typingTimers = new Map<string, NodeJS.Timeout>();
  // Key: `${channelId}` -> Set<staffId>
  private activeTypers = new Map<string, Set<string>>();

  private constructor() {}

  public static getInstance(): ChatPresenceEngine {
    if (!ChatPresenceEngine.instance) {
      ChatPresenceEngine.instance = new ChatPresenceEngine();
    }
    return ChatPresenceEngine.instance;
  }

  public recordHeartbeat(staffId: string, institutionId: string, status: PresenceStatus = "online"): void {
    const prev = this.presenceMap.get(staffId);
    const now = Date.now();

    this.presenceMap.set(staffId, {
      staffId,
      institutionId,
      status,
      lastHeartbeat: now,
    });

    // If status changed or was offline, broadcast update to user's channels
    if (!prev || prev.status !== status) {
      this.broadcastPresenceToUserChannels(staffId, institutionId, status);
    }
  }

  public setUserOffline(staffId: string, institutionId: string): void {
    const prev = this.presenceMap.get(staffId);
    if (!prev || prev.status === "offline") return;

    this.presenceMap.set(staffId, {
      staffId,
      institutionId,
      status: "offline",
      lastHeartbeat: Date.now(),
    });

    this.broadcastPresenceToUserChannels(staffId, institutionId, "offline");
  }

  public getPresence(staffId: string): PresenceStatus {
    const state = this.presenceMap.get(staffId);
    if (!state) return "offline";

    // If heartbeat older than 60s, consider offline
    if (Date.now() - state.lastHeartbeat > 60_000) {
      return "offline";
    }
    return state.status;
  }

  public setTyping(staffId: string, channelId: string, institutionId: string, isTyping: boolean): void {
    const key = `${channelId}:${staffId}`;
    const existingTimer = this.typingTimers.get(key);

    if (existingTimer) {
      clearTimeout(existingTimer);
      this.typingTimers.delete(key);
    }

    if (!this.activeTypers.has(channelId)) {
      this.activeTypers.set(channelId, new Set());
    }
    const typers = this.activeTypers.get(channelId)!;

    if (isTyping) {
      typers.add(staffId);
      // Auto-expire typing after 5 seconds if no stop received
      const timer = setTimeout(() => {
        typers.delete(staffId);
        this.typingTimers.delete(key);
        this.broadcastTyping(channelId, staffId, institutionId, false);
      }, 5000);
      this.typingTimers.set(key, timer);
      this.broadcastTyping(channelId, staffId, institutionId, true);
    } else {
      typers.delete(staffId);
      this.broadcastTyping(channelId, staffId, institutionId, false);
    }
  }

  public getActiveTypers(channelId: string): string[] {
    const typers = this.activeTypers.get(channelId);
    return typers ? Array.from(typers) : [];
  }

  private broadcastTyping(channelId: string, staffId: string, institutionId: string, isTyping: boolean): void {
    const event: ChatEvent = {
      type: "typing:update",
      channelId,
      senderId: staffId,
      institutionId,
      payload: { staffId, channelId, isTyping },
      timestamp: new Date().toISOString(),
    };
    chatPubSub.publishToChannel(channelId, event);
  }

  private broadcastPresenceToUserChannels(staffId: string, institutionId: string, status: PresenceStatus): void {
    const channels = chatPubSub.getUserChannels(staffId);
    const timestamp = new Date().toISOString();

    for (const channelId of channels) {
      const event: ChatEvent = {
        type: "presence:update",
        channelId,
        senderId: staffId,
        institutionId,
        payload: { staffId, channelId, status },
        timestamp,
      };
      chatPubSub.publishToChannel(channelId, event);
    }
  }

  public reset(): void {
    for (const timer of this.typingTimers.values()) {
      clearTimeout(timer);
    }
    this.typingTimers.clear();
    this.activeTypers.clear();
    this.presenceMap.clear();
  }
}

export const chatPresence = ChatPresenceEngine.getInstance();
