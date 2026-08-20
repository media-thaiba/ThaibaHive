import { AgentDomain } from './marl-types';

export interface AgentMessage {
  id: string;
  senderAgentId: string;
  targetAgentId?: string; // If omitted, broadcast
  domain: AgentDomain;
  messageType: 'RESOURCE_BID' | 'ENERGY_CURTAIL_REQUEST' | 'ROUTING_COORDINATION' | 'DISPATCH_ALERT' | 'HEARTBEAT';
  payload: Record<string, any>;
  timestamp: string;
  institutionId: string;
  campusId: string;
}

export type MessageHandler = (msg: AgentMessage) => void | Promise<void>;

/**
 * Distributed Cross-Campus Agent Communication Mesh
 * Handles peer-to-peer, multicast, and broadcast message routing with deduplication.
 */
export class AgentCommunicationMesh {
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private messageHistory: Map<string, number> = new Map();
  private readonly dedupTtlMs = 60000;

  /**
   * Subscribes an agent or listener to messages for a domain or agent ID
   */
  public subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);

    return () => {
      this.subscribers.get(topic)?.delete(handler);
    };
  }

  /**
   * Publishes a message to the mesh
   */
  public async publish(msg: AgentMessage): Promise<boolean> {
    // Deduplication check
    const now = Date.now();
    if (this.messageHistory.has(msg.id)) {
      return false; // Duplicate
    }
    this.messageHistory.set(msg.id, now);
    this.cleanupDedupCache(now);

    const topicsToNotify: string[] = ['*', msg.domain];
    if (msg.targetAgentId) {
      topicsToNotify.push(`agent:${msg.targetAgentId}`);
    }
    if (msg.campusId) {
      topicsToNotify.push(`campus:${msg.campusId}`);
    }

    const notifiedHandlers = new Set<MessageHandler>();

    for (const topic of topicsToNotify) {
      const handlers = this.subscribers.get(topic);
      if (handlers) {
        for (const handler of handlers) {
          if (!notifiedHandlers.has(handler)) {
            notifiedHandlers.add(handler);
            try {
              await handler(msg);
            } catch (err) {
              console.error(`Error in mesh handler for topic ${topic}:`, err);
            }
          }
        }
      }
    }

    return true;
  }

  private cleanupDedupCache(now: number): void {
    if (this.messageHistory.size > 1000) {
      for (const [id, time] of this.messageHistory.entries()) {
        if (now - time > this.dedupTtlMs) {
          this.messageHistory.delete(id);
        }
      }
    }
  }

  public getSubscriberCount(topic: string): number {
    return this.subscribers.get(topic)?.size || 0;
  }
}
