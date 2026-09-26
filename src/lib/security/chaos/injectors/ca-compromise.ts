/**
 * Security & State Chaos Injectors
 * Sprint-042 (ARES) — ARES-007
 */

import { ChaosInjector, ChaosTargetDefinition } from '../chaos-types';

export class CaCompromiseInjector implements ChaosInjector {
  public faultType = 'CA_COMPROMISE' as const;
  private compromisedCAs: Set<string> = new Set();

  public async inject(target: ChaosTargetDefinition, _params: Record<string, unknown>): Promise<boolean> {
    this.compromisedCAs.add(target.targetIdentifier);
    return true;
  }

  public async revert(target: ChaosTargetDefinition): Promise<boolean> {
    this.compromisedCAs.delete(target.targetIdentifier);
    return true;
  }

  public isFaultActive(target: ChaosTargetDefinition): boolean {
    return this.compromisedCAs.has(target.targetIdentifier);
  }
}

export class TokenReplayInjector implements ChaosInjector {
  public faultType = 'TOKEN_REPLAY' as const;
  private activeReplayTargets: Map<string, number> = new Map(); // burst rate

  public async inject(target: ChaosTargetDefinition, params: Record<string, unknown>): Promise<boolean> {
    const burstRate = typeof params.burstRate === 'number' ? params.burstRate : 50;
    this.activeReplayTargets.set(target.targetIdentifier, burstRate);
    return true;
  }

  public async revert(target: ChaosTargetDefinition): Promise<boolean> {
    this.activeReplayTargets.delete(target.targetIdentifier);
    return true;
  }

  public isFaultActive(target: ChaosTargetDefinition): boolean {
    return this.activeReplayTargets.has(target.targetIdentifier);
  }
}

export class SplitBrainInjector implements ChaosInjector {
  public faultType = 'DATABASE_SPLIT_BRAIN' as const;
  private splitBrainClusters: Map<string, number> = new Map(); // lag ms

  public async inject(target: ChaosTargetDefinition, params: Record<string, unknown>): Promise<boolean> {
    const lagMs = typeof params.replicationLagMs === 'number' ? params.replicationLagMs : 3000;
    this.splitBrainClusters.set(target.targetIdentifier, lagMs);
    return true;
  }

  public async revert(target: ChaosTargetDefinition): Promise<boolean> {
    this.splitBrainClusters.delete(target.targetIdentifier);
    return true;
  }

  public isFaultActive(target: ChaosTargetDefinition): boolean {
    return this.splitBrainClusters.has(target.targetIdentifier);
  }
}
