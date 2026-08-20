import {
  FederatedModelMetadata,
  ModelWeights,
  ClientGradientUpdate,
  TrainingRoundSummary,
  AggregationOptions,
} from './federated-types';
import { FederatedAlgorithms } from './fed-algorithms';

/**
 * Centralized & Coordinator Federated Aggregation Server
 */
export class FederatedAggregationServer {
  private models: Map<string, FederatedModelMetadata> = new Map();
  private modelWeights: Map<string, ModelWeights[]> = new Map(); // modelId -> history of rounds
  private roundSummaries: Map<string, TrainingRoundSummary[]> = new Map();

  /**
   * Register a new global model for federated training
   */
  public registerModel(metadata: FederatedModelMetadata, initialWeights?: number[]): void {
    this.models.set(metadata.modelId, {
      ...metadata,
      currentRound: metadata.currentRound ?? 0,
      createdAt: metadata.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const initW = initialWeights || new Array(metadata.inputDimensions * metadata.outputDimensions).fill(0.01);
    const initialCheckpoint: ModelWeights = {
      modelId: metadata.modelId,
      roundNumber: 0,
      weights: initW,
      dimensions: [metadata.inputDimensions, metadata.outputDimensions],
      checksum: FederatedAlgorithms.computeChecksum(initW),
      loss: 1.0,
      accuracy: 0.5,
      timestamp: new Date().toISOString(),
    };

    this.modelWeights.set(metadata.modelId, [initialCheckpoint]);
    this.roundSummaries.set(metadata.modelId, []);
  }

  /**
   * Retrieve active global model metadata
   */
  public getModel(modelId: string): FederatedModelMetadata | undefined {
    return this.models.get(modelId);
  }

  /**
   * Retrieve latest model weights
   */
  public getLatestWeights(modelId: string): ModelWeights | undefined {
    const history = this.modelWeights.get(modelId);
    if (!history || history.length === 0) return undefined;
    return history[history.length - 1];
  }

  /**
   * Execute a single Federated Aggregation Round
   */
  public aggregateRound(
    modelId: string,
    clientUpdates: ClientGradientUpdate[],
    options: AggregationOptions = {}
  ): TrainingRoundSummary {
    const startTime = Date.now();
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const currentWeights = this.getLatestWeights(modelId);
    if (!currentWeights) {
      throw new Error(`Initial weights missing for model: ${modelId}`);
    }

    const roundNumber = model.currentRound + 1;
    const algorithm = options.algorithm || 'FedAvg';

    let aggregatedWeights: number[] = [];
    let avgLoss = 0;
    let avgAccuracy = 0;

    if (algorithm === 'FedProx') {
      const result = FederatedAlgorithms.fedProx(
        currentWeights.weights,
        clientUpdates,
        options.proximalMu ?? model.hyperparameters.proximalMu ?? 0.01
      );
      aggregatedWeights = result.aggregatedWeights;
      avgLoss = result.averageLoss;
      avgAccuracy = result.averageAccuracy;
    } else {
      // Default: FedAvg
      const result = FederatedAlgorithms.fedAvg(currentWeights.weights, clientUpdates);
      aggregatedWeights = result.aggregatedWeights;
      avgLoss = result.averageLoss;
      avgAccuracy = result.averageAccuracy;
    }

    // Record new checkpoint
    const newCheckpoint: ModelWeights = {
      modelId,
      roundNumber,
      weights: aggregatedWeights,
      dimensions: currentWeights.dimensions,
      checksum: FederatedAlgorithms.computeChecksum(aggregatedWeights),
      loss: avgLoss,
      accuracy: avgAccuracy,
      timestamp: new Date().toISOString(),
    };

    const history = this.modelWeights.get(modelId) || [];
    history.push(newCheckpoint);
    this.modelWeights.set(modelId, history);

    // Update model round state
    model.currentRound = roundNumber;
    model.updatedAt = new Date().toISOString();
    if (avgAccuracy >= 0.95 || avgLoss < 0.05) {
      model.status = 'converged';
    } else {
      model.status = 'training';
    }
    this.models.set(modelId, model);

    const totalSamples = clientUpdates.reduce((sum, u) => sum + u.sampleCount, 0);
    const epsilonConsumed = clientUpdates.reduce((sum, u) => sum + (u.dpEpsilonSpent || 0), 0);

    const summary: TrainingRoundSummary = {
      roundId: `round_${modelId}_${roundNumber}_${Date.now()}`,
      modelId,
      roundNumber,
      participatingNodeIds: clientUpdates.map((u) => u.nodeId),
      totalSamples,
      aggregationAlgorithm: algorithm,
      globalLoss: avgLoss,
      globalAccuracy: avgAccuracy,
      roundDurationMs: Date.now() - startTime,
      byzantineNodesFiltered: [],
      epsilonConsumed,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };

    const roundList = this.roundSummaries.get(modelId) || [];
    roundList.push(summary);
    this.roundSummaries.set(modelId, roundList);

    return summary;
  }

  /**
   * Retrieve training history for a model
   */
  public getRoundSummaries(modelId: string): TrainingRoundSummary[] {
    return this.roundSummaries.get(modelId) || [];
  }

  /**
   * Retrieve all registered models
   */
  public getAllModels(): FederatedModelMetadata[] {
    return Array.from(this.models.values());
  }

  /**
   * Reset server state
   */
  public clear(): void {
    this.models.clear();
    this.modelWeights.clear();
    this.roundSummaries.clear();
  }
}
