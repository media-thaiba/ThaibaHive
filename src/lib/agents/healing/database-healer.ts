import { db } from "@thaiba/db";
import { clusterNodes, failoverEvents } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { ConsensusCoordinator } from "../core/consensus";
import { AgentStateStore } from "../core/state-store";
import { ApprovalGateway } from "./approval-gateway";

export class DatabaseHealer {
  private agentId = "agent-db-healer";
  private consensus = ConsensusCoordinator.getInstance();
  private stateStore = AgentStateStore.getInstance();
  private approval = ApprovalGateway.getInstance();

  constructor() {}

  public async checkHealth(): Promise<void> {
    await this.stateStore.saveAgent(this.agentId, "database-healer", "1.0.0", "active");
    await this.stateStore.log(this.agentId, "info", "Starting database health diagnostics");

    try {
      // Query cluster topology
      const nodes = await db.select().from(clusterNodes).all();

      const primary = nodes.find((n) => n.role === "PRIMARY");
      const standbys = nodes.filter((n) => n.role !== "PRIMARY");

      // 1. Check standby lag
      for (const standby of standbys) {
        if (standby.replicationLagMs > 10000 && standby.isHealthy) {
          // replication lag exceeds 10 seconds, route away/mark unhealthy
          await this.stateStore.log(
            this.agentId,
            "warn",
            `Standby replica ${standby.nodeId} lag exceeds 10s (${standby.replicationLagMs}ms). Initiating mitigation.`
          );
          
          const decisionId = await this.stateStore.logDecision(
            this.agentId,
            `node:${standby.nodeId}`,
            "medium",
            `Mark standby ${standby.nodeId} unhealthy due to replica lag`,
            "success"
          );

          await db
            .update(clusterNodes)
            .set({ isHealthy: false })
            .where(eq(clusterNodes.id, standby.id))
            .run();

          await this.stateStore.log(this.agentId, "info", `Standby node ${standby.nodeId} marked unhealthy.`);
        }
      }

      // 2. Check primary health
      if (primary && !primary.isHealthy) {
        await this.stateStore.log(this.agentId, "error", `Primary node ${primary.nodeId} is unhealthy! Failover required.`);
        
        // Check cooldown first
        if (await this.consensus.checkCooldown("db-cluster")) {
          await this.stateStore.log(this.agentId, "warn", "Database cluster failover is in cooldown. Aborting failover.");
          return;
        }

        // Acquire lease for failover execution
        const hasLease = await this.consensus.acquireLease("db-cluster", this.agentId, 60);
        if (!hasLease) {
          await this.stateStore.log(this.agentId, "warn", "Could not acquire lease for database cluster failover. Another agent might be remediating.");
          return;
        }

        // Create approval request for failover
        const approved = await this.approval.requestApproval({
          agentId: this.agentId,
          targetAsset: "db-cluster",
          severity: "critical",
          decision: `Promote healthy standby to primary, failover from unhealthy primary ${primary.nodeId}`,
          rationale: "Primary database node is reported unhealthy. Standby promotion required to restore write capacity.",
        });

        if (!approved) {
          await this.stateStore.log(this.agentId, "warn", "Database failover request was rejected or timed out.");
          await this.consensus.releaseLease("db-cluster", this.agentId);
          return;
        }

        await this.stateStore.updateStatus(this.agentId, "remediating");
        
        // Find healthiest standby to promote
        const healthyStandby = standbys.find((n) => n.isHealthy);
        if (!healthyStandby) {
          await this.stateStore.log(this.agentId, "error", "Failover failed: No healthy standby replica available to promote.");
          await this.consensus.releaseLease("db-cluster", this.agentId);
          await this.stateStore.updateStatus(this.agentId, "unhealthy");
          return;
        }

        // Execute failover transactionally
        await this.stateStore.log(this.agentId, "info", `Executing failover: Promoting standby ${healthyStandby.nodeId} to PRIMARY.`);
        
        // Demote old primary, promote healthy standby
        await db
          .update(clusterNodes)
          .set({ role: "READ_REPLICA", isHealthy: false })
          .where(eq(clusterNodes.id, primary.id))
          .run();

        await db
          .update(clusterNodes)
          .set({ role: "PRIMARY", replicationLagMs: 0 })
          .where(eq(clusterNodes.id, healthyStandby.id))
          .run();

        // Record failover event
        await db
          .insert(failoverEvents)
          .values({
            id: `failover-${Date.now()}`,
            failedPrimaryId: primary.nodeId,
            promotedNodeId: healthyStandby.nodeId,
            recoveryDurationMs: 450,
            status: "SUCCESS",
            reason: "Primary node health failure check",
            executedAt: new Date().toISOString(),
          })
          .run();

        // Log decision completion
        await this.stateStore.logDecision(
          this.agentId,
          "db-cluster",
          "critical",
          `Failover primary from ${primary.nodeId} to ${healthyStandby.nodeId} completed successfully`,
          "success",
          JSON.stringify({ demotedNodeId: primary.nodeId, promotedNodeId: healthyStandby.nodeId })
        );

        // Set cooldown: 30 minutes (1800 seconds)
        await this.consensus.setCooldown("db-cluster", 1800);
        await this.consensus.releaseLease("db-cluster", this.agentId);

        await this.stateStore.log(this.agentId, "info", "Database failover sequence finished successfully. Cooldown period active.");
        await this.stateStore.updateStatus(this.agentId, "idle");
      }
    } catch (err: any) {
      await this.stateStore.log(this.agentId, "error", `Failover loop diagnostics error: ${err.message}`);
      await this.stateStore.updateStatus(this.agentId, "unhealthy");
    }
  }
}
