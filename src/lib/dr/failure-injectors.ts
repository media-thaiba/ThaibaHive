/**
 * Failure Injectors for Disaster Recovery Chaos Engineering
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { ActiveFault, FailureInjector, FailureType } from "./types";

export abstract class BaseFailureInjector implements FailureInjector {
  abstract type: FailureType;
  protected faults: Map<string, ActiveFault> = new Map();
  protected timers: Map<string, NodeJS.Timeout> = new Map();

  public async inject(
    target: string,
    params: Record<string, unknown> = {},
    ttlMs: number = 60000
  ): Promise<ActiveFault> {
    const faultId = `fault_${this.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const expires = new Date(now.getTime() + ttlMs);

    const fault: ActiveFault = {
      id: faultId,
      type: this.type,
      target,
      params,
      injectedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      active: true,
      ttlMs,
    };

    this.faults.set(faultId, fault);

    // Apply specific fault mutation
    await this.applyFault(fault);

    // Auto-expire safety timer
    const timer = setTimeout(async () => {
      await this.remove(faultId);
    }, ttlMs);
    
    // Unref timer so it doesn't hold open Node process if needed
    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this.timers.set(faultId, timer);

    return fault;
  }

  public async remove(faultId: string): Promise<boolean> {
    const fault = this.faults.get(faultId);
    if (!fault) return false;

    if (this.timers.has(faultId)) {
      clearTimeout(this.timers.get(faultId)!);
      this.timers.delete(faultId);
    }

    await this.revertFault(fault);
    fault.active = false;
    this.faults.delete(faultId);
    return true;
  }

  public async reset(): Promise<void> {
    for (const faultId of Array.from(this.faults.keys())) {
      await this.remove(faultId);
    }
  }

  public getActiveFaults(): ActiveFault[] {
    return Array.from(this.faults.values()).filter((f) => f.active);
  }

  protected abstract applyFault(fault: ActiveFault): Promise<void>;
  protected abstract revertFault(fault: ActiveFault): Promise<void>;
}

export class DatabasePrimaryDropInjector extends BaseFailureInjector {
  type: FailureType = "DATABASE_PRIMARY_DROP";
  private static isSimulatedPrimaryDown = false;

  public static isPrimaryDown(): boolean {
    return this.isSimulatedPrimaryDown;
  }

  protected async applyFault(_fault: ActiveFault): Promise<void> {
    DatabasePrimaryDropInjector.isSimulatedPrimaryDown = true;
  }

  protected async revertFault(_fault: ActiveFault): Promise<void> {
    DatabasePrimaryDropInjector.isSimulatedPrimaryDown = false;
  }
}

export class ReplicaLagInjector extends BaseFailureInjector {
  type: FailureType = "REPLICA_LAG_INJECTION";
  private static laggedReplicas: Map<string, number> = new Map();

  public static getInjectedLag(replicaId: string): number {
    return this.laggedReplicas.get(replicaId) || 0;
  }

  protected async applyFault(fault: ActiveFault): Promise<void> {
    const lagMs = Number(fault.params.lagMs || 10000);
    ReplicaLagInjector.laggedReplicas.set(fault.target, lagMs);
  }

  protected async revertFault(fault: ActiveFault): Promise<void> {
    ReplicaLagInjector.laggedReplicas.delete(fault.target);
  }
}

export class NetworkPartitionInjector extends BaseFailureInjector {
  type: FailureType = "NETWORK_PARTITION";
  private static partitionedRegions: Set<string> = new Set();

  public static isRegionPartitioned(region: string): boolean {
    return this.partitionedRegions.has(region);
  }

  protected async applyFault(fault: ActiveFault): Promise<void> {
    NetworkPartitionInjector.partitionedRegions.add(fault.target);
  }

  protected async revertFault(fault: ActiveFault): Promise<void> {
    NetworkPartitionInjector.partitionedRegions.delete(fault.target);
  }
}

export class EdgeCacheDisconnectInjector extends BaseFailureInjector {
  type: FailureType = "EDGE_CACHE_DISCONNECT";
  private static isDisconnected = false;

  public static isEdgeCacheDisconnected(): boolean {
    return this.isDisconnected;
  }

  protected async applyFault(_fault: ActiveFault): Promise<void> {
    EdgeCacheDisconnectInjector.isDisconnected = true;
  }

  protected async revertFault(_fault: ActiveFault): Promise<void> {
    EdgeCacheDisconnectInjector.isDisconnected = false;
  }
}

export class RedisMeshPartitionInjector extends BaseFailureInjector {
  type: FailureType = "REDIS_MESH_PARTITION";
  private static partitionedMeshRegions: Set<string> = new Set();

  public static isMeshPartitioned(region: string): boolean {
    return this.partitionedMeshRegions.has(region);
  }

  protected async applyFault(fault: ActiveFault): Promise<void> {
    RedisMeshPartitionInjector.partitionedMeshRegions.add(fault.target);
  }

  protected async revertFault(fault: ActiveFault): Promise<void> {
    RedisMeshPartitionInjector.partitionedMeshRegions.delete(fault.target);
  }
}
