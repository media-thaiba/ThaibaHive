import { AgentMessage, MessageHandler } from "./types";
import { randomUUID } from "crypto";

export class AgentMessageBus {
  private static instance: AgentMessageBus;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private queue: AgentMessage[] = [];
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): AgentMessageBus {
    if (!AgentMessageBus.instance) {
      AgentMessageBus.instance = new AgentMessageBus();
    }
    return AgentMessageBus.instance;
  }

  public subscribe(topic: string, handler: MessageHandler): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
  }

  public unsubscribe(topic: string, handler: MessageHandler): void {
    const handlers = this.subscriptions.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(topic);
      }
    }
  }

  public publish(
    senderId: string,
    recipientId: string,
    topic: string,
    payload: Record<string, unknown>,
    priority: "high" | "normal" | "low" = "normal"
  ): AgentMessage {
    const message: AgentMessage = {
      id: randomUUID(),
      senderId,
      recipientId,
      topic,
      payload,
      priority,
      timestamp: new Date().toISOString(),
    };

    // Envelope validation
    if (!message.senderId || !message.topic || !message.payload) {
      throw new Error("Invalid message envelope");
    }

    this.queue.push(message);
    
    // Sort queue by priority: high first, then normal, then low
    const priorityWeight = { high: 3, normal: 2, low: 1 };
    this.queue.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    this.processQueue();

    return message;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const msg = this.queue.shift()!;
        
        // 1. Broad pub-sub topic delivery
        const topicHandlers = this.subscriptions.get(msg.topic);
        if (topicHandlers) {
          const promises = Array.from(topicHandlers).map(async (handler) => {
            try {
              await handler(msg);
            } catch (err) {
              console.error(`Error in topic ${msg.topic} handler:`, err);
            }
          });
          await Promise.all(promises);
        }

        // 2. Direct point-to-point recipient delivery
        if (msg.recipientId && msg.recipientId !== "*") {
          const directHandlers = this.subscriptions.get(msg.recipientId);
          if (directHandlers) {
            const promises = Array.from(directHandlers).map(async (handler) => {
              try {
                await handler(msg);
              } catch (err) {
                console.error(`Error in direct recipient ${msg.recipientId} handler:`, err);
              }
            });
            await Promise.all(promises);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  public clear(): void {
    this.subscriptions.clear();
    this.queue = [];
    this.isProcessing = false;
  }
}
