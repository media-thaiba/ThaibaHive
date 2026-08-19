/**
 * Chaos Simulation Engine
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import {
  ActiveFault,
  FailureInjector,
  FailureType,
} from "./types";
import {
  DatabasePrimaryDropInjector,
  EdgeCacheDisconnectInjector,
  NetworkPartitionInjector,
  RedisMeshPartitionInjector,
  ReplicaLagInjector,
} from "./failure-injectors";

export class ChaosEngine {
  private static instance: ChaosEngine;
  private injectors: Map<FailureType, FailureInjector> = new Map();

  private constructor() {
    this.registerInjector(new DatabasePrimaryDropInjector());
    this.registerInjector(new ReplicaLagInjector());
    this.registerInjector(new NetworkPartitionInjector());
    this.registerInjector(new EdgeCacheDisconnectInjector());
    this.registerInjector(new RedisMeshPartitionInjector());
  }

  public static getInstance(): ChaosEngine {
    if (!ChaosEngine.instance) {
      ChaosEngine.instance = new ChaosEngine();
    }
    return ChaosEngine.instance;
  }

  public isChaosEnabled(): boolean {
    // Chaos must be explicitly enabled or in test environment
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    return process.env.DR_CHAOS_ENABLED === "true";
  }

  public registerInjector(injector: FailureInjector): void {
    this.injectors.set(injector.type, injector);
  }

  public getInjector(type: FailureType): FailureInjector | undefined {
    return this.injectors.get(type);
  }

  public async injectFailure(
    type: FailureType,
    target: string = "default",
    params: Record<string, unknown> = {},
    ttlMs: number = 60000
  ): Promise<ActiveFault> {
    if (!this.isChaosEnabled()) {
      throw new Error(
        "DR Chaos Engineering is disabled. Set DR_CHAOS_ENABLED=true to allow fault injection."
      );
    }

    const injector = this.injectors.get(type);
    if (!injector) {
      throw new Error(`No failure injector registered for type: ${type}`);
    }

    return await injector.inject(target, params, ttlMs);
  }

  public async removeFailure(faultId: string): Promise<boolean> {
    for (const injector of Array.from(this.injectors.values())) {
      const removed = await injector.remove(faultId);
      if (removed) return true;
    }
    return false;
  }

  public async resetAll(): Promise<void> {
    for (const injector of Array.from(this.injectors.values())) {
      await injector.reset();
    }
  }

  public getAllActiveFaults(): ActiveFault[] {
    const active: ActiveFault[] = [];
    for (const injector of Array.from(this.injectors.values())) {
      active.push(...injector.getActiveFaults());
    }
    return active;
  }
}

export const chaosEngine = ChaosEngine.getInstance();
