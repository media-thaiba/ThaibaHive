/**
 * Network & Traffic Chaos Injectors
 * Sprint-042 (ARES) — ARES-006
 */

import { ChaosInjector, ChaosTargetDefinition } from '../chaos-types';

export class NetworkPartitionInjector implements ChaosInjector {
  public faultType = 'NETWORK_PARTITION' as const;
  private activePartitions: Set<string> = new Set();

  public async inject(target: ChaosTargetDefinition, _params: Record<string, unknown>): Promise<boolean> {
    this.activePartitions.add(target.targetIdentifier);
    return true;
  }

  public async revert(target: ChaosTargetDefinition): Promise<boolean> {
    this.activePartitions.delete(target.targetIdentifier);
    return true;
  }

  public isFaultActive(target: ChaosTargetDefinition): boolean {
    return this.activePartitions.has(target.targetIdentifier);
  }
}

export class PacketCorruptionInjector implements ChaosInjector {
  public faultType = 'PACKET_CORRUPTION' as const;
  private activeCorruptions: Map<string, number> = new Map();

  public async inject(target: ChaosTargetDefinition, params: Record<string, unknown>): Promise<boolean> {
    const rate = typeof params.corruptionRate === 'number' ? params.corruptionRate : 0.1;
    this.activeCorruptions.set(target.targetIdentifier, rate);
    return true;
  }

  public async revert(target: ChaosTargetDefinition): Promise<boolean> {
    this.activeCorruptions.delete(target.targetIdentifier);
    return true;
  }

  public isFaultActive(target: ChaosTargetDefinition): boolean {
    return this.activeCorruptions.has(target.targetIdentifier);
  }
}

export class LatencyInjector implements ChaosInjector {
  public faultType = 'LATENCY_JITTER' as const;
  private activeDelays: Map<string, { minMs: number; maxMs: number }> = new Map();

  public async inject(target: ChaosTargetDefinition, params: Record<string, unknown>): Promise<boolean> {
    const minMs = typeof params.minDelayMs === 'number' ? params.minDelayMs : 100;
    const maxMs = typeof params.maxDelayMs === 'number' ? params.maxDelayMs : 500;
    this.activeDelays.set(target.targetIdentifier, { minMs, maxMs });
    return true;
  }

  public async revert(target: ChaosTargetDefinition): Promise<boolean> {
    this.activeDelays.delete(target.targetIdentifier);
    return true;
  }

  public isFaultActive(target: ChaosTargetDefinition): boolean {
    return this.activeDelays.has(target.targetIdentifier);
  }

  public getInjectedDelayMs(target: ChaosTargetDefinition): number {
    const config = this.activeDelays.get(target.targetIdentifier);
    if (!config) return 0;
    return Math.floor(Math.random() * (config.maxMs - config.minMs + 1)) + config.minMs;
  }
}

export class ServiceDegradationInjector implements ChaosInjector {
  public faultType = 'SERVICE_DEGRADATION' as const;
  private activeDegradations: Map<string, number> = new Map(); // statusCode

  public async inject(target: ChaosTargetDefinition, params: Record<string, unknown>): Promise<boolean> {
    const code = typeof params.statusCode === 'number' ? params.statusCode : 503;
    this.activeDegradations.set(target.targetIdentifier, code);
    return true;
  }

  public async revert(target: ChaosTargetDefinition): Promise<boolean> {
    this.activeDegradations.delete(target.targetIdentifier);
    return true;
  }

  public isFaultActive(target: ChaosTargetDefinition): boolean {
    return this.activeDegradations.has(target.targetIdentifier);
  }
}
