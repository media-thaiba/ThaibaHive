/**
 * Chaos Scenario Registry
 * Sprint-042 (ARES) — ARES-005
 */

import { ChaosScenario } from './chaos-types';

export const CANONICAL_CHAOS_SCENARIOS: ChaosScenario[] = [
  {
    scenarioId: 'chaos-net-partition-edge',
    name: 'Edge Subnet Network Partition Simulation',
    description: 'Simulates complete bidirectional isolation of Edge Gateway from Campus VLAN 20',
    faultType: 'NETWORK_PARTITION',
    target: { targetType: 'SUBNET', targetIdentifier: 'vlan-20-student', blastRadiusPercentage: 20 },
    durationSeconds: 15,
    parameters: { packetDropRate: 1.0, direction: 'BOTH' },
    safetyThresholds: { maxErrorRatePercent: 2.0, maxP99LatencyMs: 1200, maxConsecutiveFailures: 3 },
  },
  {
    scenarioId: 'chaos-packet-corruption-mesh',
    name: 'mTLS Payload Packet Corruption',
    description: 'Injects pseudo-random bit flips into 15% of inter-service RPC requests to verify integrity guards',
    faultType: 'PACKET_CORRUPTION',
    target: { targetType: 'SERVICE', targetIdentifier: 'auth-mesh-node-1', blastRadiusPercentage: 15 },
    durationSeconds: 10,
    parameters: { corruptionRate: 0.15 },
    safetyThresholds: { maxErrorRatePercent: 1.5, maxP99LatencyMs: 800, maxConsecutiveFailures: 2 },
  },
  {
    scenarioId: 'chaos-latency-jitter-gateway',
    name: 'API Gateway Latency Jitter Injection',
    description: 'Injects Gaussian distributed latency delays (200ms - 800ms) to test client timeout recovery',
    faultType: 'LATENCY_JITTER',
    target: { targetType: 'GATEWAY', targetIdentifier: 'api-gateway-primary', blastRadiusPercentage: 25 },
    durationSeconds: 20,
    parameters: { minDelayMs: 200, maxDelayMs: 800, jitter: 0.2 },
    safetyThresholds: { maxErrorRatePercent: 1.0, maxP99LatencyMs: 1500, maxConsecutiveFailures: 3 },
  },
  {
    scenarioId: 'chaos-ca-compromise-rotation',
    name: 'Intermediate CA Key Compromise & Emergency CRL',
    description: 'Simulates compromised intermediate CA certificate to verify instant mesh revocation and failover',
    faultType: 'CA_COMPROMISE',
    target: { targetType: 'PKI_CA', targetIdentifier: 'intermediate-ca-campus-1', blastRadiusPercentage: 10 },
    durationSeconds: 10,
    parameters: { revocationReason: 'KEY_COMPROMISE' },
    safetyThresholds: { maxErrorRatePercent: 0.5, maxP99LatencyMs: 500, maxConsecutiveFailures: 2 },
  },
  {
    scenarioId: 'chaos-db-split-brain-recovery',
    name: 'Dual-Store Database Replication Split-Brain',
    description: 'Simulates transient network split between SQLite local replica and PostgreSQL primary',
    faultType: 'DATABASE_SPLIT_BRAIN',
    target: { targetType: 'DATABASE', targetIdentifier: 'primary-db-cluster', blastRadiusPercentage: 10 },
    durationSeconds: 12,
    parameters: { replicationLagMs: 5000 },
    safetyThresholds: { maxErrorRatePercent: 1.0, maxP99LatencyMs: 2000, maxConsecutiveFailures: 2 },
  },
];

export class ScenarioRegistry {
  private static instance: ScenarioRegistry | null = null;
  private scenarios: Map<string, ChaosScenario> = new Map();

  private constructor() {
    for (const sc of CANONICAL_CHAOS_SCENARIOS) {
      this.scenarios.set(sc.scenarioId, sc);
    }
  }

  public static getInstance(): ScenarioRegistry {
    if (!ScenarioRegistry.instance) {
      ScenarioRegistry.instance = new ScenarioRegistry();
    }
    return ScenarioRegistry.instance;
  }

  public registerScenario(scenario: ChaosScenario): void {
    this.scenarios.set(scenario.scenarioId, scenario);
  }

  public getScenario(id: string): ChaosScenario | undefined {
    return this.scenarios.get(id);
  }

  public listScenarios(): ChaosScenario[] {
    return Array.from(this.scenarios.values());
  }
}
