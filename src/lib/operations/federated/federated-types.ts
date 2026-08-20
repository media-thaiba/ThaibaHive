/**
 * Federated Learning Core Type Definitions (A-FED / EdgeMesh)
 */

export interface FederatedModelMetadata {
  modelId: string;
  name: string;
  domain: 'retention' | 'financial' | 'resource_demand' | 'academic' | 'energy';
  version: string;
  architecture: 'logistic_regression' | 'mlp' | 'decision_tree' | 'transformer_lite';
  inputDimensions: number;
  outputDimensions: number;
  featureNames: string[];
  targetName: string;
  hyperparameters: {
    learningRate: number;
    batchSize: number;
    localEpochs: number;
    proximalMu?: number;
    weightDecay?: number;
    targetEpsilon?: number;
  };
  currentRound: number;
  status: 'initialized' | 'training' | 'converged' | 'deployed' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}

export interface ModelWeights {
  modelId: string;
  roundNumber: number;
  weights: number[]; // Flattened float array
  biases?: number[];
  dimensions: number[];
  checksum: string; // SHA-256
  loss?: number;
  accuracy?: number;
  timestamp: string;
}

export interface ClientGradientUpdate {
  nodeId: string;
  campusId: string;
  modelId: string;
  roundNumber: number;
  sampleCount: number;
  gradients: number[]; // Local weights or deltas
  localLoss: number;
  localAccuracy: number;
  dpEpsilonSpent: number;
  zkProof?: string;
  checksum: string;
  timestamp: string;
}

export interface FederatedNode {
  nodeId: string;
  campusId: string;
  campusName: string;
  status: 'idle' | 'training' | 'reporting' | 'offline';
  computeTier: 'edge_kiosk' | 'campus_server' | 'mobile_client';
  sampleCount: number;
  availableMemoryMb: number;
  networkLatencyMs: number;
  lastHeartbeat: string;
  totalRoundsParticipated: number;
  reputationScore: number; // 0.0 - 1.0 (Byzantine filtering)
}

export interface TrainingRoundSummary {
  roundId: string;
  modelId: string;
  roundNumber: number;
  participatingNodeIds: string[];
  totalSamples: number;
  aggregationAlgorithm: 'FedAvg' | 'FedProx' | 'Krum' | 'TrimmedMean' | 'CoordinateMedian';
  globalLoss: number;
  globalAccuracy: number;
  roundDurationMs: number;
  byzantineNodesFiltered: string[];
  epsilonConsumed: number;
  status: 'in_progress' | 'completed' | 'failed' | 'halted';
  timestamp: string;
}

export interface AggregationOptions {
  algorithm?: 'FedAvg' | 'FedProx' | 'Krum' | 'TrimmedMean' | 'CoordinateMedian';
  proximalMu?: number;
  trimmedMeanBeta?: number; // 0.0 - 0.5
  krumMaliciousCount?: number;
  learningRate?: number;
}
