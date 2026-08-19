import { AgentStateStore } from "../core/state-store";
import { ConsensusCoordinator } from "../core/consensus";

export interface PoolMetrics {
  poolName: string;
  activeConnections: number;
  maxConnections: number;
  queueWaitTimeMs: number;
}

// Global registry for dynamic connection pools to fetch configs
export const dynamicPoolConfigs = new Map<string, { maxConnections: number }>();

export class PoolHealer {
  private agentId = "agent-pool-healer";
  private stateStore = AgentStateStore.getInstance();
  private consensus = ConsensusCoordinator.getInstance();
  private baselineMaxConnections = 20;

  constructor() {}

  public async monitorPools(pools: PoolMetrics[]): Promise<void> {
    await this.stateStore.saveAgent(this.agentId, "pool-healer", "1.0.0", "active");

    for (const pool of pools) {
      const configKey = `pool:${pool.poolName}`;
      
      // Initialize pool config if not present
      if (!dynamicPoolConfigs.has(pool.poolName)) {
        dynamicPoolConfigs.set(pool.poolName, { maxConnections: pool.maxConnections });
      }

      const currentConfig = dynamicPoolConfigs.get(pool.poolName)!;

      if (pool.queueWaitTimeMs > 200) {
        // queue wait time exceeds 200ms, scale up connection limit
        const limitCeiling = this.baselineMaxConnections * 2.0; // max 200% scaling
        
        if (currentConfig.maxConnections < limitCeiling) {
          const newLimit = Math.min(limitCeiling, Math.ceil(currentConfig.maxConnections * 1.5));
          
          await this.stateStore.log(
            this.agentId,
            "warn",
            `Pool ${pool.poolName} queue wait time is high (${pool.queueWaitTimeMs}ms). Scaling connections limit from ${currentConfig.maxConnections} to ${newLimit}.`
          );

          if (await this.consensus.checkCooldown(configKey)) {
            continue;
          }

          // Acquire lock
          const lock = await this.consensus.acquireLease(configKey, this.agentId, 10);
          if (!lock) continue;

          await this.stateStore.updateStatus(this.agentId, "remediating");

          currentConfig.maxConnections = newLimit;
          dynamicPoolConfigs.set(pool.poolName, currentConfig);

          await this.stateStore.logDecision(
            this.agentId,
            pool.poolName,
            "medium",
            `Scale up connection pool ${pool.poolName} to ${newLimit} connections`,
            "success",
            JSON.stringify({ poolName: pool.poolName, oldMax: pool.maxConnections, newMax: newLimit })
          );

          await this.consensus.setCooldown(configKey, 60); // 1 minute cooldown
          await this.consensus.releaseLease(configKey, this.agentId);
          await this.stateStore.updateStatus(this.agentId, "idle");
        }
      } else if (pool.activeConnections < currentConfig.maxConnections * 0.3 && pool.queueWaitTimeMs < 50) {
        // Under-utilization: scale down to conserve database sockets
        if (currentConfig.maxConnections > this.baselineMaxConnections) {
          const newLimit = Math.max(this.baselineMaxConnections, Math.floor(currentConfig.maxConnections * 0.8));

          await this.stateStore.log(
            this.agentId,
            "info",
            `Pool ${pool.poolName} is under-utilized (active connections: ${pool.activeConnections}/${currentConfig.maxConnections}). Scaling down connection limit to ${newLimit}.`
          );

          if (await this.consensus.checkCooldown(configKey)) {
            continue;
          }

          // Acquire lock
          const lock = await this.consensus.acquireLease(configKey, this.agentId, 10);
          if (!lock) continue;

          await this.stateStore.updateStatus(this.agentId, "remediating");

          currentConfig.maxConnections = newLimit;
          dynamicPoolConfigs.set(pool.poolName, currentConfig);

          await this.stateStore.logDecision(
            this.agentId,
            pool.poolName,
            "low",
            `Scale down connection pool ${pool.poolName} to ${newLimit} connections`,
            "success",
            JSON.stringify({ poolName: pool.poolName, oldMax: pool.maxConnections, newMax: newLimit })
          );

          await this.consensus.setCooldown(configKey, 60);
          await this.consensus.releaseLease(configKey, this.agentId);
          await this.stateStore.updateStatus(this.agentId, "idle");
        }
      }
    }
  }
}
