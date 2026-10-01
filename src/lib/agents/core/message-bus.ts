import { AgentMessage, MessageHandler } from "./types";
import { randomUUID } from "crypto";
import { agentDbStore } from "../../db/agent-store";

export interface DeadLetterMessage {
  message: AgentMessage;
  error: string;
  failedAt: string;
  attempts: number;
}

export class AgentMessageBus {
  private static instance: AgentMessageBus;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private queue: AgentMessage[] = [];
  private deadLetterQueue: DeadLetterMessage[] = [];
  private isProcessing = false;
  private maxAttempts = 3;

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

  private activeProcessingPromise: Promise<void> | null = null;

  public async publishAsync(
    senderId: string,
    recipientId: string,
    topic: string,
    payload: Record<string, unknown>,
    priority: "critical" | "high" | "normal" | "low" = "normal",
    options?: {
      institutionId?: string;
      traceId?: string;
      durable?: boolean;
    }
  ): Promise<AgentMessage> {
    const msg = this.publish(senderId, recipientId, topic, payload, priority, options);
    await this.flush();
    return msg;
  }

  public publish(
    senderId: string,
    recipientId: string,
    topic: string,
    payload: Record<string, unknown>,
    priority: "critical" | "high" | "normal" | "low" = "normal",
    options?: {
      institutionId?: string;
      traceId?: string;
      durable?: boolean;
    }
  ): AgentMessage {
    const message: AgentMessage = {
      id: randomUUID(),
      senderId,
      recipientId,
      topic,
      payload,
      priority,
      timestamp: new Date().toISOString(),
      institutionId: options?.institutionId || "global",
      traceId: options?.traceId,
      attempts: 0,
    };

    // Envelope validation
    if (!message.senderId || !message.topic || !message.payload) {
      throw new Error("Invalid message envelope");
    }

    if (options?.durable) {
      const priorityMap: Record<string, number> = { critical: 2, high: 1, normal: 0, low: 0 };
      agentDbStore.enqueueMessage({
        id: message.id,
        institutionId: message.institutionId || "global",
        topic: message.topic,
        senderAgentId: message.senderId,
        recipientAgentId: message.recipientId === "*" ? undefined : message.recipientId,
        payloadJson: JSON.stringify(message.payload),
        priority: priorityMap[message.priority] ?? 0,
        traceId: message.traceId,
      }).catch(() => {});
    }

    this.enqueue(message);
    return message;
  }

  public enqueue(message: AgentMessage): void {
    this.queue.push(message);
    
    // Sort queue by priority: critical (4) -> high (3) -> normal (2) -> low (1)
    const priorityWeight: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };
    this.queue.sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));

    this.processQueue();
  }

  public async flush(): Promise<void> {
    if (this.activeProcessingPromise) {
      await this.activeProcessingPromise;
    }
  }

  private processQueue(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.activeProcessingPromise = (async () => {
      try {
        while (this.queue.length > 0) {
          const msg = this.queue.shift()!;
          msg.attempts = (msg.attempts || 0) + 1;
          
          let hadError = false;
          let lastErrText = "";

          // 1. Broad pub-sub topic delivery
          const topicHandlers = this.subscriptions.get(msg.topic);
          if (topicHandlers && topicHandlers.size > 0) {
            const promises = Array.from(topicHandlers).map(async (handler) => {
              try {
                await handler(msg);
              } catch (err: any) {
                hadError = true;
                lastErrText = err?.message || String(err);
              }
            });
            await Promise.all(promises);
          }

          // 2. Direct point-to-point recipient delivery
          if (msg.recipientId && msg.recipientId !== "*") {
            const directHandlers = this.subscriptions.get(msg.recipientId);
            if (directHandlers && directHandlers.size > 0) {
              const promises = Array.from(directHandlers).map(async (handler) => {
                try {
                  await handler(msg);
                } catch (err: any) {
                  hadError = true;
                  lastErrText = err?.message || String(err);
                }
              });
              await Promise.all(promises);
            }
          }

          if (hadError) {
            if (msg.attempts < this.maxAttempts) {
              // Requeue with backoff / retry
              this.queue.push(msg);
            } else {
              // Move to Dead Letter Queue
              this.deadLetterQueue.push({
                message: msg,
                error: lastErrText,
                failedAt: new Date().toISOString(),
                attempts: msg.attempts,
              });
              agentDbStore.updateMessageStatus(msg.id, "dead_letter", lastErrText, msg.institutionId).catch(() => {});
            }
          } else {
            agentDbStore.updateMessageStatus(msg.id, "delivered", undefined, msg.institutionId).catch(() => {});
          }
        }
      } finally {
        this.isProcessing = false;
        this.activeProcessingPromise = null;
      }
    })();
  }


  public getDeadLetters(topic?: string, institutionId?: string): DeadLetterMessage[] {
    return this.deadLetterQueue.filter((dlq) => {
      if (topic && dlq.message.topic !== topic) return false;
      if (institutionId && dlq.message.institutionId !== institutionId) return false;
      return true;
    });
  }

  public replayDeadLetters(topic?: string, institutionId?: string): number {
    const matching: DeadLetterMessage[] = [];
    const remaining: DeadLetterMessage[] = [];

    for (const dlq of this.deadLetterQueue) {
      const matchTopic = !topic || dlq.message.topic === topic;
      const matchInst = !institutionId || dlq.message.institutionId === institutionId;
      if (matchTopic && matchInst) {
        matching.push(dlq);
      } else {
        remaining.push(dlq);
      }
    }

    this.deadLetterQueue = remaining;

    for (const item of matching) {
      const resetMsg: AgentMessage = {
        ...item.message,
        attempts: 0,
      };
      this.enqueue(resetMsg);
    }

    return matching.length;
  }

  public clear(): void {
    this.subscriptions.clear();
    this.queue = [];
    this.deadLetterQueue = [];
    this.isProcessing = false;
  }
}

export const agentMessageBus = AgentMessageBus.getInstance();


