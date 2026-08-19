/**
 * PostgreSQL & Multi-Region Database Replica Health & Lag Tracker
 * Part of Sprint-034: Enterprise Multi-Region Infrastructure & Automated Dependency Security
 */

import { replicaRouter, isPostgres, sql } from "@/db";
import { DatabasePrimaryDropInjector, ReplicaLagInjector } from "@/lib/dr/failure-injectors";

export interface ReplicaHealthReport {
  timestamp: string;
  clusterStatus: "healthy" | "degraded" | "failed";
  primaryHealthy: boolean;
  totalReplicas: number;
  healthyReplicas: number;
  replicas: {
    id: string;
    url: string;
    isHealthy: boolean;
    lagMs: number;
    lastCheckedAt: string;
    totalQueriesRouted: number;
  }[];
  lagThresholdMs: number;
}

export class ReplicaHealthTracker {
  private static instance: ReplicaHealthTracker;
  private lagThresholdMs = 5000; // 5s threshold for degraded isolation

  private constructor() {}

  public static getInstance(): ReplicaHealthTracker {
    if (!ReplicaHealthTracker.instance) {
      ReplicaHealthTracker.instance = new ReplicaHealthTracker();
    }
    return ReplicaHealthTracker.instance;
  }

  public setLagThreshold(ms: number) {
    this.lagThresholdMs = ms;
  }

  public async checkClusterHealth(): Promise<ReplicaHealthReport> {
    const statuses = replicaRouter.getReplicaStatuses();
    const checkedReplicas = [];
    let healthyCount = 0;

    for (let i = 0; i < statuses.length; i++) {
      const node = statuses[i];
      const startTime = Date.now();
      let isHealthy = false;
      let lagMs = 0;

      try {
        const replicaDb = (replicaRouter as any).replicaDbs?.[i];
        if (replicaDb) {
          if (isPostgres) {
            // Check Postgres replication lag
            const res = await replicaDb.all(sql`
              SELECT 
                COALESCE(EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000, 0) AS lag_ms
            `).catch(async () => {
              // Fallback simple ping if not in recovery
              await replicaDb.all(sql`SELECT 1`);
              return [{ lag_ms: 0 }];
            });
            lagMs = Number(res[0]?.lag_ms ?? 0);
          } else {
            // SQLite/LibSQL ping check
            await replicaDb.all(sql`SELECT 1`);
            lagMs = Date.now() - startTime;
          }

          const injectedLag = ReplicaLagInjector.getInjectedLag(node.id);
          if (injectedLag > 0) {
            lagMs += injectedLag;
          }

          isHealthy = lagMs <= this.lagThresholdMs;
        }
      } catch (err) {
        console.warn(`[ReplicaHealthTracker] Health check failed for ${node.id}:`, err);
        isHealthy = false;
        lagMs = 99999;
      }

      replicaRouter.markReplicaHealth(i, isHealthy, lagMs);
      if (isHealthy) healthyCount++;

      checkedReplicas.push({
        id: node.id,
        url: node.url,
        isHealthy,
        lagMs,
        lastCheckedAt: new Date().toISOString(),
        totalQueriesRouted: node.totalQueriesRouted,
      });
    }

    const primaryHealthy = !DatabasePrimaryDropInjector.isPrimaryDown();

    let clusterStatus: "healthy" | "degraded" | "failed" = "healthy";
    if (!primaryHealthy) {
      clusterStatus = healthyCount > 0 ? "degraded" : "failed";
    } else if (statuses.length > 0 && healthyCount === 0) {
      clusterStatus = "degraded";
    } else if (statuses.length > 0 && healthyCount < statuses.length) {
      clusterStatus = "degraded";
    }

    return {
      timestamp: new Date().toISOString(),
      clusterStatus,
      primaryHealthy,
      totalReplicas: statuses.length,
      healthyReplicas: healthyCount,
      replicas: checkedReplicas,
      lagThresholdMs: this.lagThresholdMs,
    };
  }
}

export const replicaHealthTracker = ReplicaHealthTracker.getInstance();

