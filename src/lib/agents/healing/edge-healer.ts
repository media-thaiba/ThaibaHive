import { db } from "@thaiba/db";
import { edgeNodes, cacheEvents } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { ConsensusCoordinator } from "../core/consensus";
import { AgentStateStore } from "../core/state-store";

export interface EdgeTelemetry {
  nodeId: string;
  errorRate: number; // 0 to 1
  latencyMs: number;
}

export class EdgeHealer {
  private agentId = "agent-edge-healer";
  private consensus = ConsensusCoordinator.getInstance();
  private stateStore = AgentStateStore.getInstance();

  constructor() {}

  public async checkHealth(telemetry: EdgeTelemetry[]): Promise<void> {
    await this.stateStore.saveAgent(this.agentId, "edge-healer", "1.0.0", "active");

    for (const node of telemetry) {
      if (node.errorRate > 0.10) { // error rate exceeds 10%
        await this.stateStore.log(
          this.agentId,
          "warn",
          `Edge worker node ${node.nodeId} error rate is high: ${(node.errorRate * 100).toFixed(1)}%. Initiating recovery.`
        );

        // Check cooldown
        if (await this.consensus.checkCooldown(`edge:${node.nodeId}`)) {
          await this.stateStore.log(this.agentId, "info", `Edge recovery for ${node.nodeId} in cooldown. Skipping.`);
          continue;
        }

        // Acquire lock
        const lock = await this.consensus.acquireLease(`edge:${node.nodeId}`, this.agentId, 30);
        if (!lock) continue;

        await this.stateStore.updateStatus(this.agentId, "remediating");

        // Action: Mark node offline to trigger fallback to origin
        await db
          .update(edgeNodes)
          .set({ status: "OFFLINE", latencyMs: 9999 })
          .where(eq(edgeNodes.id, node.nodeId))
          .run();

        // Action: Invalidate cache for node
        const cacheEvictId = `evict-${Date.now()}`;
        await db
          .insert(cacheEvents)
          .values({
            id: cacheEvictId,
            tenantId: "global",
            cacheKey: `edge:${node.nodeId}:*`,
            action: "EVICT",
            status: "SUCCESS",
            executedAt: new Date().toISOString(),
          })
          .run();

        await this.stateStore.logDecision(
          this.agentId,
          `edge:${node.nodeId}`,
          "high",
          `Mark node offline and evict cache key due to high error rate`,
          "success",
          JSON.stringify({ edgeNodeId: node.nodeId, errorRate: node.errorRate })
        );

        // Cooldown: 5 minutes (300 seconds)
        await this.consensus.setCooldown(`edge:${node.nodeId}`, 300);
        await this.consensus.releaseLease(`edge:${node.nodeId}`, this.agentId);

        await this.stateStore.log(this.agentId, "info", `Edge worker node ${node.nodeId} successfully routed to origin fallback.`);
        await this.stateStore.updateStatus(this.agentId, "idle");
      }
    }
  }
}
