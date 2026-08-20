import { ClientGradientUpdate, ModelWeights } from './federated-types';
import * as crypto from 'crypto';

/**
 * Federated Learning Algorithms (FedAvg & FedProx)
 */
export class FederatedAlgorithms {
  /**
   * Federated Averaging (FedAvg)
   * Formula: w^{t+1} = sum_{k=1}^K (n_k / N) * w_k^{t+1}
   */
  public static fedAvg(
    globalWeights: number[],
    clientUpdates: ClientGradientUpdate[]
  ): { aggregatedWeights: number[]; averageLoss: number; averageAccuracy: number } {
    if (!clientUpdates || clientUpdates.length === 0) {
      return {
        aggregatedWeights: [...globalWeights],
        averageLoss: 0,
        averageAccuracy: 0,
      };
    }

    const totalSamples = clientUpdates.reduce((sum, u) => sum + Math.max(1, u.sampleCount), 0);
    const weightLength = globalWeights.length;
    const aggregatedWeights = new Array(weightLength).fill(0);

    let weightedLossSum = 0;
    let weightedAccSum = 0;

    for (const update of clientUpdates) {
      const weightRatio = Math.max(1, update.sampleCount) / totalSamples;
      weightedLossSum += update.localLoss * weightRatio;
      weightedAccSum += update.localAccuracy * weightRatio;

      for (let i = 0; i < weightLength; i++) {
        const clientVal = update.gradients[i] !== undefined ? update.gradients[i] : (globalWeights[i] || 0);
        aggregatedWeights[i] += clientVal * weightRatio;
      }
    }

    return {
      aggregatedWeights,
      averageLoss: weightedLossSum,
      averageAccuracy: weightedAccSum,
    };
  }

  /**
   * Federated Proximal (FedProx)
   * Handles non-IID data distribution by adding proximal regularization term (mu / 2) * ||w - w^t||^2
   */
  public static fedProx(
    globalWeights: number[],
    clientUpdates: ClientGradientUpdate[],
    proximalMu: number = 0.01
  ): { aggregatedWeights: number[]; averageLoss: number; averageAccuracy: number } {
    if (!clientUpdates || clientUpdates.length === 0) {
      return {
        aggregatedWeights: [...globalWeights],
        averageLoss: 0,
        averageAccuracy: 0,
      };
    }

    // Adjust each client update based on distance to globalWeights
    const adjustedUpdates: ClientGradientUpdate[] = clientUpdates.map((update) => {
      const adjustedGradients = update.gradients.map((val, idx) => {
        const globalVal = globalWeights[idx] || 0;
        const proximalCorrection = proximalMu * (val - globalVal);
        return val - proximalCorrection;
      });

      return {
        ...update,
        gradients: adjustedGradients,
      };
    });

    return this.fedAvg(globalWeights, adjustedUpdates);
  }

  /**
   * Computes SHA-256 checksum for weights vector
   */
  public static computeChecksum(weights: number[]): string {
    const buffer = Buffer.from(new Float64Array(weights).buffer);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Computes Euclidean L2 Norm ||w||_2
   */
  public static computeL2Norm(vector: number[]): number {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      sumSq += vector[i] * vector[i];
    }
    return Math.sqrt(sumSq);
  }

  /**
   * Computes Euclidean Distance between two vectors
   */
  public static computeDistance(vecA: number[], vecB: number[]): number {
    let sumSq = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      const diff = vecA[i] - vecB[i];
      sumSq += diff * diff;
    }
    return Math.sqrt(sumSq);
  }

  /**
   * Alias wrappers for fedAvg and fedProx
   */
  public static aggregateFedAvg(updates: { weights: number[]; sampleCount: number; localLoss?: number; localAccuracy?: number }[]): number[] {
    const dim = updates[0]?.weights?.length || 0;
    const globalWeights = new Array(dim).fill(0);
    const formatted: ClientGradientUpdate[] = updates.map((u) => ({
      nodeId: 'node',
      campusId: 'campus',
      modelId: 'm',
      roundNumber: 1,
      sampleCount: u.sampleCount,
      gradients: u.weights,
      localLoss: u.localLoss || 0,
      localAccuracy: u.localAccuracy || 0,
      dpEpsilonSpent: 0,
      checksum: '',
      timestamp: new Date().toISOString(),
    }));
    return this.fedAvg(globalWeights, formatted).aggregatedWeights;
  }

  public static aggregateFedProx(
    updates: { weights: number[]; sampleCount: number; localLoss?: number; localAccuracy?: number }[],
    currentWeights: number[],
    mu: number = 0.01
  ): number[] {
    const formatted: ClientGradientUpdate[] = updates.map((u) => ({
      nodeId: 'node',
      campusId: 'campus',
      modelId: 'm',
      roundNumber: 1,
      sampleCount: u.sampleCount,
      gradients: u.weights,
      localLoss: u.localLoss || 0,
      localAccuracy: u.localAccuracy || 0,
      dpEpsilonSpent: 0,
      checksum: '',
      timestamp: new Date().toISOString(),
    }));
    return this.fedProx(currentWeights, formatted, mu).aggregatedWeights;
  }
}

export const FedAlgorithms = FederatedAlgorithms;
