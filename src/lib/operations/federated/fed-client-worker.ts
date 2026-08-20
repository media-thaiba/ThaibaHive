import { ClientGradientUpdate, ModelWeights } from './federated-types';
import { FederatedAlgorithms } from './fed-algorithms';

export interface LocalTrainingDataset {
  features: number[][]; // [sampleIdx][featureIdx]
  labels: number[];     // binary 0 or 1, or multi-class
}

/**
 * Local Client Worker executing local epochs on edge campus data
 */
export class FederatedClientWorker {
  private nodeId: string;
  private campusId: string;

  constructor(nodeId: string, campusId: string) {
    this.nodeId = nodeId;
    this.campusId = campusId;
  }

  /**
   * Execute local training on edge node data
   */
  public trainLocalEpochs(
    currentGlobalWeights: ModelWeights,
    dataset: LocalTrainingDataset,
    epochs: number = 3,
    learningRate: number = 0.05
  ): ClientGradientUpdate {
    const weights = [...currentGlobalWeights.weights];
    const nSamples = dataset.features.length;

    if (nSamples === 0) {
      return {
        nodeId: this.nodeId,
        campusId: this.campusId,
        modelId: currentGlobalWeights.modelId,
        roundNumber: currentGlobalWeights.roundNumber,
        sampleCount: 0,
        gradients: weights,
        localLoss: 0,
        localAccuracy: 1.0,
        dpEpsilonSpent: 0,
        checksum: FederatedAlgorithms.computeChecksum(weights),
        timestamp: new Date().toISOString(),
      };
    }

    let totalLoss = 0;
    let correct = 0;

    // Perform SGD iterations
    for (let e = 0; e < epochs; e++) {
      for (let i = 0; i < nSamples; i++) {
        const x = dataset.features[i];
        const y = dataset.labels[i];

        // Linear / Logistic forward: z = sum(w_j * x_j)
        let z = 0;
        for (let j = 0; j < x.length && j < weights.length; j++) {
          z += weights[j] * x[j];
        }

        // Sigmoid activation
        const yPred = 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, z))));
        const error = yPred - y;

        // Binary Cross-Entropy Loss
        const sampleLoss = -(y * Math.log(Math.max(1e-7, yPred)) + (1 - y) * Math.log(Math.max(1e-7, 1 - yPred)));
        if (e === epochs - 1) {
          totalLoss += sampleLoss;
          if ((yPred >= 0.5 && y === 1) || (yPred < 0.5 && y === 0)) {
            correct++;
          }
        }

        // Gradient update: w_j = w_j - lr * error * x_j
        for (let j = 0; j < x.length && j < weights.length; j++) {
          weights[j] -= learningRate * error * x[j];
        }
      }
    }

    const avgLoss = totalLoss / nSamples;
    const accuracy = correct / nSamples;

    return {
      nodeId: this.nodeId,
      campusId: this.campusId,
      modelId: currentGlobalWeights.modelId,
      roundNumber: currentGlobalWeights.roundNumber,
      sampleCount: nSamples,
      gradients: weights,
      localLoss: Number(avgLoss.toFixed(4)),
      localAccuracy: Number(accuracy.toFixed(4)),
      dpEpsilonSpent: 0.1, // baseline
      checksum: FederatedAlgorithms.computeChecksum(weights),
      timestamp: new Date().toISOString(),
    };
  }
}
