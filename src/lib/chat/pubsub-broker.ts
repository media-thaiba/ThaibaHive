import { EventEmitter } from "events";

export interface ChatEvent<T = unknown> {
  type:
    | "message:new"
    | "message:ack"
    | "message:edit"
    | "message:delete"
    | "receipt:update"
    | "presence:update"
    | "typing:update"
    | "channel:update";
  channelId?: string;
  senderId?: string;
  institutionId: string;
  payload: T;
  timestamp: string;
}

export interface ChatSubscriber {
  staffId: string;
  institutionId: string;
  send: (event: ChatEvent) => void;
  isAlive: boolean;
}

/**
 * In-memory / Cluster Pub-Sub Broker for Real-Time Chat Mesh.
 * Handles channel-scoped and user-targeted message fan-out with tenant boundary checks.
 */
export class ChatPubSubBroker {
  private static instance: ChatPubSubBroker;
  private emitter = new EventEmitter();
  
  // channelId -> Set of subscribers
  private channelSubscribers = new Map<string, Set<ChatSubscriber>>();
  // staffId -> Set of subscribers (for multi-device/multi-tab support)
  private userSubscribers = new Map<string, Set<ChatSubscriber>>();
  // staffId -> Set of channelIds joined
  private userChannels = new Map<string, Set<string>>();

  private constructor() {
    this.emitter.setMaxListeners(5000);
  }

  public static getInstance(): ChatPubSubBroker {
    if (!ChatPubSubBroker.instance) {
      ChatPubSubBroker.instance = new ChatPubSubBroker();
    }
    return ChatPubSubBroker.instance;
  }

  public subscribeChannel(channelId: string, subscriber: ChatSubscriber): void {
    if (!this.channelSubscribers.has(channelId)) {
      this.channelSubscribers.set(channelId, new Set());
    }
    this.channelSubscribers.get(channelId)!.add(subscriber);

    // Track user's joined channels
    if (!this.userChannels.has(subscriber.staffId)) {
      this.userChannels.set(subscriber.staffId, new Set());
    }
    this.userChannels.get(subscriber.staffId)!.add(channelId);
  }

  public unsubscribeChannel(channelId: string, subscriber: ChatSubscriber): void {
    const subs = this.channelSubscribers.get(channelId);
    if (subs) {
      subs.delete(subscriber);
      if (subs.size === 0) {
        this.channelSubscribers.delete(channelId);
      }
    }

    const channels = this.userChannels.get(subscriber.staffId);
    if (channels) {
      channels.delete(channelId);
      if (channels.size === 0) {
        this.userChannels.delete(subscriber.staffId);
      }
    }
  }

  public registerUserConnection(subscriber: ChatSubscriber): void {
    if (!this.userSubscribers.has(subscriber.staffId)) {
      this.userSubscribers.set(subscriber.staffId, new Set());
    }
    this.userSubscribers.get(subscriber.staffId)!.add(subscriber);
  }

  public unregisterUserConnection(subscriber: ChatSubscriber): void {
    const userSubs = this.userSubscribers.get(subscriber.staffId);
    if (userSubs) {
      userSubs.delete(subscriber);
      if (userSubs.size === 0) {
        this.userSubscribers.delete(subscriber.staffId);
      }
    }

    // Clean up channel memberships for this subscriber
    for (const [channelId, subs] of this.channelSubscribers.entries()) {
      if (subs.has(subscriber)) {
        subs.delete(subscriber);
        if (subs.size === 0) {
          this.channelSubscribers.delete(channelId);
        }
      }
    }
  }

  /**
   * Broadcast an event to all subscribers of a channel within the same tenant.
   */
  public publishToChannel(channelId: string, event: ChatEvent): void {
    const subscribers = this.channelSubscribers.get(channelId);
    if (!subscribers) return;

    for (const sub of subscribers) {
      // Enforce strict tenant boundary check
      if (sub.institutionId === event.institutionId) {
        try {
          sub.send(event);
        } catch (err) {
          console.error(`[ChatPubSub] Failed to send event to subscriber ${sub.staffId}:`, err);
        }
      }
    }
  }

  /**
   * Send a direct event to a specific user (all their active connections).
   */
  public publishToUser(staffId: string, event: ChatEvent): void {
    const subscribers = this.userSubscribers.get(staffId);
    if (!subscribers) return;

    for (const sub of subscribers) {
      if (sub.institutionId === event.institutionId) {
        try {
          sub.send(event);
        } catch (err) {
          console.error(`[ChatPubSub] Failed to send direct event to user ${staffId}:`, err);
        }
      }
    }
  }

  /**
   * Check if a user has any active connections.
   */
  public isUserOnline(staffId: string): boolean {
    const subs = this.userSubscribers.get(staffId);
    return Boolean(subs && subs.size > 0);
  }

  /**
   * Get all active channel IDs for a user.
   */
  public getUserChannels(staffId: string): Set<string> {
    return this.userChannels.get(staffId) ?? new Set();
  }

  /**
   * Clear all subscribers (useful for testing).
   */
  public reset(): void {
    this.channelSubscribers.clear();
    this.userSubscribers.clear();
    this.userChannels.clear();
    this.emitter.removeAllListeners();
  }
}

export const chatPubSub = ChatPubSubBroker.getInstance();
