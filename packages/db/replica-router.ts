/**
 * PostgreSQL & LibSQL Read-Replica Connection Pool & Dynamic Query Router
 * Part of Sprint-034: Enterprise Multi-Region Infrastructure & Automated Dependency Security
 */

export interface ReplicaConfig {
  primaryUrl: string;
  replicaUrls: string[];
  enabled: boolean;
  sessionStickinessTtlMs: number;
}

export interface ReplicaNodeStatus {
  id: string;
  url: string;
  isHealthy: boolean;
  lagMs: number;
  lastCheckedAt: string;
  totalQueriesRouted: number;
}

export class ReplicaQueryRouter {
  private primaryDb: any;
  private replicaDbs: any[] = [];
  private replicaNodes: ReplicaNodeStatus[] = [];
  private enabled: boolean;
  private sessionStickinessTtlMs: number;
  private sessionWriteTimestamps = new Map<string, number>();
  private roundRobinCounter = 0;

  constructor(
    primaryDb: any,
    replicaDbs: any[] = [],
    config: Partial<ReplicaConfig> = {}
  ) {
    this.primaryDb = primaryDb;
    this.replicaDbs = replicaDbs;
    this.enabled = config.enabled ?? (process.env.DB_READ_REPLICAS_ENABLED !== "false" && replicaDbs.length > 0);
    this.sessionStickinessTtlMs = config.sessionStickinessTtlMs ?? 2000;

    const urls = config.replicaUrls || [];
    this.replicaNodes = replicaDbs.map((_, i) => ({
      id: `replica-${i + 1}`,
      url: urls[i] || `replica-node-${i + 1}`,
      isHealthy: true,
      lagMs: 0,
      lastCheckedAt: new Date().toISOString(),
      totalQueriesRouted: 0,
    }));
  }

  public isEnabled(): boolean {
    return this.enabled && this.replicaDbs.length > 0;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public registerReplica(replicaDb: any, url?: string): void {
    const id = `replica-${this.replicaDbs.length + 1}`;
    this.replicaDbs.push(replicaDb);
    this.replicaNodes.push({
      id,
      url: url || id,
      isHealthy: true,
      lagMs: 0,
      lastCheckedAt: new Date().toISOString(),
      totalQueriesRouted: 0,
    });
    if (process.env.DB_READ_REPLICAS_ENABLED !== "false") {
      this.enabled = true;
    }
  }

  public recordWrite(sessionId?: string): void {
    if (!sessionId) return;
    this.sessionWriteTimestamps.set(sessionId, Date.now());
  }

  public isSessionPinnedToPrimary(sessionId?: string): boolean {
    if (!sessionId) return false;
    const writeTime = this.sessionWriteTimestamps.get(sessionId);
    if (!writeTime) return false;

    const elapsed = Date.now() - writeTime;
    if (elapsed < this.sessionStickinessTtlMs) {
      return true;
    }

    // Cleanup expired session
    this.sessionWriteTimestamps.delete(sessionId);
    return false;
  }

  public getWriteDb(sessionId?: string): any {
    if (sessionId) {
      this.recordWrite(sessionId);
    }
    return this.primaryDb;
  }

  public getReadDb(sessionId?: string): any {
    // If replicas disabled, no healthy replicas, or session has recent write -> route to primary
    if (!this.isEnabled() || this.isSessionPinnedToPrimary(sessionId)) {
      return this.primaryDb;
    }

    const healthyIndices: number[] = [];
    for (let i = 0; i < this.replicaNodes.length; i++) {
      if (this.replicaNodes[i].isHealthy && this.replicaDbs[i]) {
        healthyIndices.push(i);
      }
    }

    if (healthyIndices.length === 0) {
      return this.primaryDb;
    }

    const selectedIndex = healthyIndices[this.roundRobinCounter % healthyIndices.length];
    this.roundRobinCounter = (this.roundRobinCounter + 1) % 1000000;
    this.replicaNodes[selectedIndex].totalQueriesRouted++;

    return this.replicaDbs[selectedIndex];
  }

  public markReplicaHealth(index: number, isHealthy: boolean, lagMs = 0): void {
    if (this.replicaNodes[index]) {
      this.replicaNodes[index].isHealthy = isHealthy;
      this.replicaNodes[index].lagMs = lagMs;
      this.replicaNodes[index].lastCheckedAt = new Date().toISOString();
    }
  }

  public getReplicaStatuses(): ReplicaNodeStatus[] {
    return [...this.replicaNodes];
  }

  public clearSessions(): void {
    this.sessionWriteTimestamps.clear();
  }
}
