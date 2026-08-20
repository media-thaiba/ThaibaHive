import { db } from '@thaiba/db';
import {
  afedModels,
  afedNodes,
  afedTrainingRounds,
  afedModelWeights,
  afedPrivacyBudgets,
  afedSmpcSessions,
  afedDriftMetrics,
  afedBenchmarks,
  afedPredictions,
} from '@thaiba/db/schema';
import { eq } from 'drizzle-orm';

export interface InMemoryAfedStore {
  models: Map<string, any>;
  nodes: Map<string, any>;
  trainingRounds: Map<string, any>;
  modelWeights: Map<string, any>;
  privacyBudgets: Map<string, any>;
  smpcSessions: Map<string, any>;
  driftMetrics: Map<string, any>;
  benchmarks: Map<string, any>;
  predictions: Map<string, any>;
}

export class AfedDbStore {
  private static instance: AfedDbStore;
  private memoryStore: InMemoryAfedStore = {
    models: new Map(),
    nodes: new Map(),
    trainingRounds: new Map(),
    modelWeights: new Map(),
    privacyBudgets: new Map(),
    smpcSessions: new Map(),
    driftMetrics: new Map(),
    benchmarks: new Map(),
    predictions: new Map(),
  };

  public static getInstance(): AfedDbStore {
    if (!AfedDbStore.instance) {
      AfedDbStore.instance = new AfedDbStore();
    }
    return AfedDbStore.instance;
  }

  // ─── Models ───
  public async saveModelAsync(model: any): Promise<void> {
    const id = `model_${model.modelId}`;
    const payload = {
      id,
      modelId: model.modelId,
      name: model.name,
      domain: model.domain,
      version: model.version || '1.0.0',
      architecture: model.architecture || 'logistic_regression',
      inputDimensions: model.inputDimensions || 1,
      outputDimensions: model.outputDimensions || 1,
      hyperparametersData: JSON.stringify(model.hyperparameters || {}),
      currentRound: model.currentRound ?? 0,
      status: model.status || 'initialized',
      institutionId: model.institutionId || 'global',
      updatedAt: new Date().toISOString(),
    };

    this.memoryStore.models.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(afedModels).where(eq(afedModels.modelId, model.modelId));
        if (existing && existing.length > 0) {
          await db.update(afedModels).set(payload).where(eq(afedModels.modelId, model.modelId));
        } else {
          await db.insert(afedModels).values(payload);
        }
      }
    } catch {
      // Graceful fallback to memory store
    }
  }

  public saveModel(model: any): void {
    const id = `model_${model.modelId}`;
    this.memoryStore.models.set(id, {
      ...model,
      id,
      institutionId: model.institutionId || 'global',
      updatedAt: new Date().toISOString(),
    });
    this.saveModelAsync(model).catch(() => {});
  }

  public async getModelAsync(modelId: string): Promise<any> {
    try {
      if (db) {
        const rows = await db.select().from(afedModels).where(eq(afedModels.modelId, modelId));
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {
      // Fallback
    }
    return this.memoryStore.models.get(`model_${modelId}`);
  }

  public getModel(modelId: string): any {
    return this.memoryStore.models.get(`model_${modelId}`);
  }

  public async getAllModelsAsync(): Promise<any[]> {
    try {
      if (db) {
        const rows = await db.select().from(afedModels);
        if (rows && rows.length > 0) return rows;
      }
    } catch {
      // Fallback
    }
    return Array.from(this.memoryStore.models.values());
  }

  public getAllModels(): any[] {
    return Array.from(this.memoryStore.models.values());
  }

  // ─── Nodes ───
  public async saveNodeAsync(node: any): Promise<void> {
    const id = `node_${node.nodeId}`;
    const payload = {
      id,
      nodeId: node.nodeId,
      campusId: node.campusId,
      campusName: node.campusName,
      status: node.status || 'idle',
      computeTier: node.computeTier || 'campus_server',
      sampleCount: node.sampleCount || 0,
      availableMemoryMb: node.availableMemoryMb || 1024,
      networkLatencyMs: node.networkLatencyMs || 20,
      reputationScore: node.reputationScore || 1.0,
      institutionId: node.institutionId || 'global',
      lastHeartbeat: new Date().toISOString(),
    };

    this.memoryStore.nodes.set(id, payload);

    try {
      if (db) {
        const existing = await db.select().from(afedNodes).where(eq(afedNodes.nodeId, node.nodeId));
        if (existing && existing.length > 0) {
          await db.update(afedNodes).set(payload).where(eq(afedNodes.nodeId, node.nodeId));
        } else {
          await db.insert(afedNodes).values(payload);
        }
      }
    } catch {
      // Fallback
    }
  }

  public saveNode(node: any): void {
    const id = `node_${node.nodeId}`;
    this.memoryStore.nodes.set(id, {
      ...node,
      id,
      institutionId: node.institutionId || 'global',
      lastHeartbeat: new Date().toISOString(),
    });
    this.saveNodeAsync(node).catch(() => {});
  }

  public async getNodeAsync(nodeId: string): Promise<any> {
    try {
      if (db) {
        const rows = await db.select().from(afedNodes).where(eq(afedNodes.nodeId, nodeId));
        if (rows && rows.length > 0) return rows[0];
      }
    } catch {}
    return this.memoryStore.nodes.get(`node_${nodeId}`);
  }

  public getNode(nodeId: string): any {
    return this.memoryStore.nodes.get(`node_${nodeId}`);
  }

  public async getAllNodesAsync(): Promise<any[]> {
    try {
      if (db) {
        const rows = await db.select().from(afedNodes);
        if (rows && rows.length > 0) return rows;
      }
    } catch {}
    return Array.from(this.memoryStore.nodes.values());
  }

  public getAllNodes(): any[] {
    return Array.from(this.memoryStore.nodes.values());
  }

  // ─── Training Rounds ───
  public async saveTrainingRoundAsync(round: any): Promise<void> {
    const id = `round_${round.roundId || round.modelId + '_' + round.roundNumber}`;
    const payload = {
      id,
      roundId: round.roundId || id,
      modelId: round.modelId,
      roundNumber: round.roundNumber,
      participantsCount: round.participantsCount || 0,
      totalSamples: round.totalSamples || 0,
      aggregationAlgorithm: round.aggregationAlgorithm || 'FedAvg',
      globalLoss: round.globalLoss || 0,
      globalAccuracy: round.globalAccuracy || 0,
      roundDurationMs: round.roundDurationMs || 0,
      epsilonConsumed: round.epsilonConsumed || 0,
      status: round.status || 'completed',
      institutionId: round.institutionId || 'global',
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.trainingRounds.set(payload.roundId, payload);

    try {
      if (db) {
        await db.insert(afedTrainingRounds).values(payload);
      }
    } catch {}
  }

  public saveTrainingRound(round: any): void {
    this.memoryStore.trainingRounds.set(round.roundId, {
      ...round,
      createdAt: new Date().toISOString(),
    });
    this.saveTrainingRoundAsync(round).catch(() => {});
  }

  public getTrainingRounds(modelId?: string): any[] {
    const list = Array.from(this.memoryStore.trainingRounds.values());
    if (modelId) {
      return list.filter((r) => r.modelId === modelId);
    }
    return list;
  }

  // ─── Privacy Budgets ───
  public async savePrivacyBudgetAsync(budget: any): Promise<void> {
    const id = `budget_${budget.tenantId}`;
    const payload = {
      id,
      tenantId: budget.tenantId,
      totalBudgetEpsilon: budget.totalBudgetEpsilon ?? 10.0,
      consumedEpsilon: budget.consumedEpsilon ?? 0,
      remainingEpsilon: (budget.totalBudgetEpsilon ?? 10.0) - (budget.consumedEpsilon ?? 0),
      totalBudgetDelta: budget.totalBudgetDelta ?? 1e-5,
      isExhausted: budget.isExhausted ?? false,
      institutionId: budget.institutionId || 'global',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.privacyBudgets.set(budget.tenantId, payload);

    try {
      if (db) {
        const existing = await db.select().from(afedPrivacyBudgets).where(eq(afedPrivacyBudgets.tenantId, budget.tenantId));
        if (existing && existing.length > 0) {
          await db.update(afedPrivacyBudgets).set(payload).where(eq(afedPrivacyBudgets.tenantId, budget.tenantId));
        } else {
          await db.insert(afedPrivacyBudgets).values(payload);
        }
      }
    } catch {}
  }

  public savePrivacyBudget(budget: any): void {
    this.memoryStore.privacyBudgets.set(budget.tenantId, {
      ...budget,
      updatedAt: new Date().toISOString(),
    });
    this.savePrivacyBudgetAsync(budget).catch(() => {});
  }

  public getPrivacyBudget(tenantId: string): any {
    return this.memoryStore.privacyBudgets.get(tenantId);
  }

  public getAllPrivacyBudgets(): any[] {
    return Array.from(this.memoryStore.privacyBudgets.values());
  }

  // ─── Model Weights ───
  public async saveModelWeightsAsync(weights: any): Promise<void> {
    const id = `weights_${weights.modelId}_${weights.roundNumber}`;
    const payload = {
      id,
      modelId: weights.modelId,
      roundNumber: weights.roundNumber || 0,
      weightsData: JSON.stringify(weights.weights || []),
      checksum: weights.checksum || '',
      format: weights.format || 'FP32',
      institutionId: weights.institutionId || 'global',
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.modelWeights.set(id, payload);

    try {
      if (db) {
        await db.insert(afedModelWeights).values(payload);
      }
    } catch {}
  }

  public saveModelWeights(weights: any): void {
    const id = `weights_${weights.modelId}_${weights.roundNumber}`;
    this.memoryStore.modelWeights.set(id, { ...weights, id, createdAt: new Date().toISOString() });
    this.saveModelWeightsAsync(weights).catch(() => {});
  }

  public getModelWeights(modelId: string): any[] {
    return Array.from(this.memoryStore.modelWeights.values()).filter((w) => w.modelId === modelId);
  }

  // ─── SMPC Sessions ───
  public async saveSmpcSessionAsync(session: any): Promise<void> {
    const id = session.sessionId || `smpc_${session.modelId}_${Date.now()}`;
    const dbPayload = {
      id,
      sessionId: id,
      modelId: session.modelId,
      roundNumber: session.roundNumber || 0,
      participantsData: JSON.stringify(session.participants || []),  // schema col: participantsData
      threshold: session.threshold || 2,
      activePhase: 'AGGREGATED',  // schema col: activePhase
      institutionId: session.institutionId || 'global',
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.smpcSessions.set(id, { ...session, id, createdAt: dbPayload.createdAt });

    try {
      if (db) {
        await db.insert(afedSmpcSessions).values(dbPayload);
      }
    } catch {}
  }

  public saveSmpcSession(session: any): void {
    const id = session.sessionId || `smpc_${session.modelId}_${Date.now()}`;
    this.memoryStore.smpcSessions.set(id, { ...session, id, createdAt: new Date().toISOString() });
    this.saveSmpcSessionAsync(session).catch(() => {});
  }

  public getSmpcSessions(modelId?: string): any[] {
    const list = Array.from(this.memoryStore.smpcSessions.values());
    return modelId ? list.filter((s) => s.modelId === modelId) : list;
  }

  // ─── Drift Metrics ───
  public async saveDriftMetricsAsync(metrics: any): Promise<void> {
    const id = metrics.id || `drift_${metrics.modelId}_${Date.now()}`;
    const dbPayload = {
      id,
      modelId: metrics.modelId,
      overallPsi: metrics.overallPsi || 0,
      maxFeatureKs: metrics.maxFeatureKs || 0,
      driftedFeatureCount: metrics.driftedFeatureCount || 0,
      hasSignificantDrift: metrics.hasSignificantDrift ? true : false,  // schema: boolean mode
      featureReportsData: JSON.stringify(metrics.featureReports || []), // schema col: featureReportsData
      institutionId: metrics.institutionId || 'global',
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.driftMetrics.set(id, { ...metrics, id, recordedAt: dbPayload.recordedAt });

    try {
      if (db) {
        await db.insert(afedDriftMetrics).values(dbPayload);
      }
    } catch {}
  }

  public saveDriftMetrics(metrics: any): void {
    const id = metrics.id || `drift_${metrics.modelId}_${Date.now()}`;
    this.memoryStore.driftMetrics.set(id, {
      ...metrics,
      recordedAt: new Date().toISOString(),
    });
    this.saveDriftMetricsAsync(metrics).catch(() => {});
  }

  public getDriftMetrics(modelId?: string): any[] {
    const list = Array.from(this.memoryStore.driftMetrics.values());
    if (modelId) {
      return list.filter((m) => m.modelId === modelId);
    }
    return list;
  }

  // ─── Benchmarks ───
  public async saveBenchmarkAsync(bench: any): Promise<void> {
    const id = `bench_${bench.campusId}_${Date.now()}`;
    const metrics = bench.metrics || {};
    const dbPayload = {
      id,
      campusId: bench.campusId,
      reportingYear: '2026',  // schema col: reportingYear
      retentionRatePercent: metrics.retentionRatePercent ?? bench.retentionRatePercent ?? 0,
      graduationRatePercent: metrics.graduationRatePercent ?? bench.graduationRatePercent ?? 0,
      rankPosition: bench.rankPosition || 1,
      percentilesData: JSON.stringify(bench.percentiles || {}),  // schema col: percentilesData
      institutionId: bench.institutionId || 'global',
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.benchmarks.set(bench.campusId, { ...bench, id, createdAt: dbPayload.createdAt });

    try {
      if (db) {
        await db.insert(afedBenchmarks).values(dbPayload);
      }
    } catch {}
  }

  public saveBenchmark(bench: any): void {
    this.memoryStore.benchmarks.set(bench.campusId, {
      ...bench,
      createdAt: new Date().toISOString(),
    });
    this.saveBenchmarkAsync(bench).catch(() => {});
  }

  public getAllBenchmarks(): any[] {
    return Array.from(this.memoryStore.benchmarks.values());
  }

  // ─── Predictions ───
  public async savePredictionAsync(pred: any): Promise<void> {
    const id = pred.predictionId || `pred_${Date.now()}`;
    const dbPayload = {
      id,
      predictionId: id,
      modelId: pred.modelId,
      predictedClass: pred.predictedClass ?? 0,
      confidenceScore: pred.confidenceScore ?? 0,
      latencyMs: pred.latencyMs ?? 0,
      executedOn: pred.executedOn || 'EDGE_LOCAL', // schema col: executedOn
      institutionId: pred.institutionId || 'global',
      createdAt: new Date().toISOString(),
    };

    this.memoryStore.predictions.set(id, { ...pred, id, createdAt: dbPayload.createdAt });

    try {
      if (db) {
        await db.insert(afedPredictions).values(dbPayload);
      }
    } catch {}
  }




  public savePrediction(pred: any): void {
    this.memoryStore.predictions.set(pred.predictionId, {
      ...pred,
      createdAt: new Date().toISOString(),
    });
    this.savePredictionAsync(pred).catch(() => {});
  }

  public getPredictions(modelId?: string): any[] {
    const list = Array.from(this.memoryStore.predictions.values());
    if (modelId) {
      return list.filter((p) => p.modelId === modelId);
    }
    return list;
  }

  public clear(): void {
    for (const key of Object.keys(this.memoryStore) as (keyof InMemoryAfedStore)[]) {
      this.memoryStore[key].clear();
    }
  }
}

