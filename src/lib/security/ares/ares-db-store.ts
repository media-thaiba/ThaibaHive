/**
 * ARES Dual-Store Database Persistence Store
 * Sprint-042 (ARES) — ARES-017
 */

import { db } from '@/db';
import {
  aresPredictiveThreats,
  aresChaosExperiments,
  aresChaosExecutions,
  aresZkpProofs,
  aresThreatGraphNodes,
  aresThreatGraphEdges,
  aresResilienceScores,
} from '@thaiba/db';
import { eq, desc } from 'drizzle-orm';
import { PredictiveThreatForecast } from './ares-types';
import { ChaosExecutionRecord } from '../chaos/chaos-types';
import { ZkAuditProofPayload } from '../zkp/zkp-types';
import { SystemResilienceSnapshot } from '../resilience/resilience-types';

export class AresDbStore {
  private static instance: AresDbStore | null = null;
  private memoryThreats: any[] = [];
  private memoryExecutions: any[] = [];
  private memoryProofs: any[] = [];
  private memorySnapshots: any[] = [];

  private constructor() {}

  public static getInstance(): AresDbStore {
    if (!AresDbStore.instance) {
      AresDbStore.instance = new AresDbStore();
    }
    return AresDbStore.instance;
  }

  public async savePredictiveThreat(forecast: PredictiveThreatForecast, tenantId: string = 'global'): Promise<void> {
    const record = {
      id: forecast.forecastId,
      category: forecast.threatCategory,
      posteriorProbability: forecast.posteriorProbability,
      confidenceScore: forecast.confidenceScore,
      severityTier: forecast.severityTier,
      projectedExploitWindowDays: forecast.projectedExploitWindowDays,
      keyIndicators: JSON.stringify(forecast.keyIndicators),
      affectedAssetIds: JSON.stringify(forecast.affectedAssetIds),
      recommendedMitigations: JSON.stringify(forecast.recommendedMitigations),
      tenantId,
      calculatedAt: forecast.calculatedAt,
    };
    this.memoryThreats.unshift(record);

    try {
      await db.insert(aresPredictiveThreats).values(record);
    } catch {
      // Non-blocking fallback
    }
  }

  public async listPredictiveThreats(limit: number = 50): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(aresPredictiveThreats)
        .orderBy(desc(aresPredictiveThreats.calculatedAt))
        .limit(limit);
      return results.length > 0 ? results : this.memoryThreats.slice(0, limit);
    } catch {
      return this.memoryThreats.slice(0, limit);
    }
  }

  public async saveChaosExecution(execution: ChaosExecutionRecord): Promise<void> {
    const record = {
      id: execution.executionId,
      scenarioId: execution.scenarioId,
      state: execution.state,
      startTime: execution.startTime,
      endTime: execution.endTime,
      baselineMetrics: JSON.stringify(execution.baselineMetrics),
      observedMetrics: JSON.stringify(execution.observedMetrics),
      recoveryTimeMs: execution.recoveryTimeMs,
      resilienceScoreDeduction: execution.resilienceScoreDeduction,
      abortReason: execution.abortReason,
      logs: JSON.stringify(execution.logs),
    };
    this.memoryExecutions.unshift(record);

    try {
      await db.insert(aresChaosExecutions).values(record);
    } catch {
      // Non-blocking fallback
    }
  }

  public async listChaosExecutions(limit: number = 50): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(aresChaosExecutions)
        .orderBy(desc(aresChaosExecutions.startTime))
        .limit(limit);
      return results.length > 0 ? results : this.memoryExecutions.slice(0, limit);
    } catch {
      return this.memoryExecutions.slice(0, limit);
    }
  }

  public async saveZkpProof(proof: ZkAuditProofPayload): Promise<void> {
    const record = {
      id: proof.proofId,
      proofId: proof.proofId,
      merkleRoot: proof.merkleRoot,
      epochTimestamp: proof.epochTimestamp,
      leafHashCommitment: proof.leafHashCommitment,
      proofData: JSON.stringify(proof.proof),
      publicInputs: JSON.stringify(proof.publicInputs),
      tenantId: proof.tenantId || 'global',
      generatedAt: proof.generatedAt,
    };
    this.memoryProofs.unshift(record);

    try {
      await db.insert(aresZkpProofs).values(record);
    } catch {
      // Non-blocking fallback
    }
  }

  public async listZkpProofs(limit: number = 50): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(aresZkpProofs)
        .orderBy(desc(aresZkpProofs.generatedAt))
        .limit(limit);
      return results.length > 0 ? results : this.memoryProofs.slice(0, limit);
    } catch {
      return this.memoryProofs.slice(0, limit);
    }
  }

  public async saveResilienceSnapshot(snapshot: SystemResilienceSnapshot, tenantId: string = 'global'): Promise<void> {
    const record = {
      id: snapshot.snapshotId,
      overallScore: snapshot.overallScore,
      tier: snapshot.tier,
      vectorBreakdown: JSON.stringify(snapshot.vectors),
      mttrSeconds: snapshot.mttrSeconds,
      unresolvedGapsCount: snapshot.unresolvedGapsCount,
      tenantId,
      calculatedAt: snapshot.calculatedAt,
    };
    this.memorySnapshots.unshift(record);

    try {
      await db.insert(aresResilienceScores).values(record);
    } catch {
      // Non-blocking fallback
    }
  }

  public async listResilienceSnapshots(limit: number = 50): Promise<any[]> {
    try {
      const results = await db
        .select()
        .from(aresResilienceScores)
        .orderBy(desc(aresResilienceScores.calculatedAt))
        .limit(limit);
      return results.length > 0 ? results : this.memorySnapshots.slice(0, limit);
    } catch {
      return this.memorySnapshots.slice(0, limit);
    }
  }
}
