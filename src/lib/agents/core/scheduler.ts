import { TaskConfig } from "./types";
import { defaultStateStore } from "../../services/redis-client";

export class AgentScheduler {
  private static instance: AgentScheduler;
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): AgentScheduler {
    if (!AgentScheduler.instance) {
      AgentScheduler.instance = new AgentScheduler();
    }
    return AgentScheduler.instance;
  }

  public schedule(config: TaskConfig, job: () => Promise<void> | void): void {
    this.cancel(config.id);

    const runWithLock = async () => {
      const lockKey = `lock:scheduler:${config.id}`;
      
      // Attempt to acquire distributed lock
      const currentLock = await defaultStateStore.get(lockKey);
      if (currentLock) {
        // Locked by another node
        return;
      }

      // Lock it for 10 seconds (or job interval if smaller)
      const ttl = config.intervalMs ? Math.max(1, Math.floor(config.intervalMs / 1000)) : 10;
      await defaultStateStore.set(lockKey, "locked", ttl);

      try {
        await job();
      } catch (err) {
        console.error(`Error executing scheduled job ${config.id}:`, err);
      } finally {
        // Automatically releases after TTL or we can delete it
        await defaultStateStore.del(lockKey);
      }
    };

    if (config.runOnce) {
      setTimeout(runWithLock, config.intervalMs || 0);
    } else {
      const intervalMs = config.intervalMs || 5000; // default 5 seconds
      const timeout = setInterval(runWithLock, intervalMs);
      this.activeIntervals.set(config.id, timeout);
    }
  }

  public cancel(id: string): void {
    const timeout = this.activeIntervals.get(id);
    if (timeout) {
      clearInterval(timeout);
      this.activeIntervals.delete(id);
    }
  }

  public clear(): void {
    for (const timeout of this.activeIntervals.values()) {
      clearInterval(timeout);
    }
    this.activeIntervals.clear();
  }
}
