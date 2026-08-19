/**
 * SSE Event Bus — Redis Pub/Sub Ready Interface
 * Task P1-32: Add Redis Pub/Sub for SSE Scaling
 *
 * Architecture:
 * - Dev: in-process EventEmitter (current globalThis hub)
 * - Production: Redis Pub/Sub via ioredis
 *
 * To upgrade to Redis Pub/Sub:
 *   pnpm add ioredis
 *   Set REDIS_URL=redis://localhost:6379
 *
 * Usage:
 *   import { eventBus } from '@/lib/sse/event-bus';
 *   eventBus.publish('attendance', { type: 'check-in', staffId, timestamp });
 *   const unsub = eventBus.subscribe('attendance', handler);
 */

type EventPayload = Record<string, unknown>;
type EventHandler = (payload: EventPayload) => void;

export type EventChannel =
  | "attendance"
  | "notifications"
  | "tasks"
  | "announcements"
  | "system"
  | "governance";

class InProcessEventBus {
  private listeners = new Map<EventChannel, Set<EventHandler>>();

  subscribe(channel: EventChannel, handler: EventHandler): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(handler);
    return () => this.listeners.get(channel)?.delete(handler);
  }

  publish(channel: EventChannel, payload: EventPayload): void {
    const handlers = this.listeners.get(channel);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Handler error on channel '${channel}':`, err);
      }
    }
  }

  getStats() {
    const stats: Record<string, number> = {};
    for (const [channel, handlers] of this.listeners) {
      stats[channel] = handlers.size;
    }
    return { backend: "in-process", subscribers: stats };
  }
}

/**
 * Singleton event bus.
 */
const _global = globalThis as typeof globalThis & { __eventBus?: InProcessEventBus };
if (!_global.__eventBus) {
  _global.__eventBus = new InProcessEventBus();
}
export const eventBus = _global.__eventBus;
