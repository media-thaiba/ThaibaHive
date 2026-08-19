import { defaultStateStore } from "../../services/redis-client";

export class ConsensusCoordinator {
  private static instance: ConsensusCoordinator;
  private defaultCooldownSeconds = 300; // 5 minutes

  private constructor() {}

  public static getInstance(): ConsensusCoordinator {
    if (!ConsensusCoordinator.instance) {
      ConsensusCoordinator.instance = new ConsensusCoordinator();
    }
    return ConsensusCoordinator.instance;
  }

  public async checkCooldown(asset: string): Promise<boolean> {
    const cooldownKey = `cooldown:${asset}`;
    const cooldown = await defaultStateStore.get(cooldownKey);
    return !!cooldown;
  }

  public async setCooldown(asset: string, seconds: number = this.defaultCooldownSeconds): Promise<void> {
    const cooldownKey = `cooldown:${asset}`;
    await defaultStateStore.set(cooldownKey, "active", seconds);
  }

  public async acquireLease(asset: string, agentId: string, ttlSeconds = 30): Promise<boolean> {
    // 1. Check cooldown
    if (await this.checkCooldown(asset)) {
      return false;
    }

    const leaseKey = `lease:${asset}`;
    const heartbeatKey = `lease:${asset}:heartbeat`;

    const currentHolder = await defaultStateStore.get(leaseKey);

    if (currentHolder) {
      if (currentHolder === agentId) {
        // Already holds lease, renew heartbeat
        await this.renewHeartbeat(asset, agentId, ttlSeconds);
        return true;
      }

      // Check if current holder's heartbeat is stale (expired)
      const lastHeartbeatStr = await defaultStateStore.get(heartbeatKey);
      const lastHeartbeat = lastHeartbeatStr ? parseInt(lastHeartbeatStr, 10) : 0;
      
      const leaseStaleThresholdMs = 10000; // 10 seconds silent is considered crashed
      if (Date.now() - lastHeartbeat > leaseStaleThresholdMs) {
        // Crashed agent, release lease and take over
        await defaultStateStore.del(leaseKey);
        await defaultStateStore.del(heartbeatKey);
      } else {
        // Valid active lease held by someone else
        return false;
      }
    }

    // Acquire lease
    await defaultStateStore.set(leaseKey, agentId, ttlSeconds);
    await defaultStateStore.set(heartbeatKey, Date.now().toString(), ttlSeconds);
    return true;
  }

  public async renewHeartbeat(asset: string, agentId: string, ttlSeconds = 30): Promise<boolean> {
    const leaseKey = `lease:${asset}`;
    const heartbeatKey = `lease:${asset}:heartbeat`;

    const holder = await defaultStateStore.get(leaseKey);
    if (holder !== agentId) {
      return false;
    }

    await defaultStateStore.set(leaseKey, agentId, ttlSeconds);
    await defaultStateStore.set(heartbeatKey, Date.now().toString(), ttlSeconds);
    return true;
  }

  public async releaseLease(asset: string, agentId: string): Promise<boolean> {
    const leaseKey = `lease:${asset}`;
    const heartbeatKey = `lease:${asset}:heartbeat`;

    const holder = await defaultStateStore.get(leaseKey);
    if (holder !== agentId) {
      return false;
    }

    await defaultStateStore.del(leaseKey);
    await defaultStateStore.del(heartbeatKey);
    return true;
  }
}
