import { ClientGradientUpdate } from './federated-types';
import { FederatedAlgorithms } from './fed-algorithms';

export interface PoisoningAnalysisResult {
  nodeId: string;
  isPoisoned: boolean;
  anomalyScore: number; // 0.0 - 1.0
  reasons: string[];
}

/**
 * Model Poisoning and Gradient Inversion Attack Detector
 */
export class PoisoningDetector {
  /**
   * Detect anomalous or poisoned client gradient updates
   */
  public static analyzeUpdates(
    updates: ClientGradientUpdate[],
    globalWeights: number[],
    thresholdZScore: number = 2.5
  ): PoisoningAnalysisResult[] {
    if (!updates || updates.length === 0) return [];

    // Calculate L2 norms of all client updates
    const norms = updates.map((u) => FederatedAlgorithms.computeL2Norm(u.gradients));
    const meanNorm = norms.reduce((s, n) => s + n, 0) / norms.length;
    const variance = norms.reduce((s, n) => s + Math.pow(n - meanNorm, 2), 0) / Math.max(1, norms.length);
    const stdDev = Math.sqrt(variance);

    // Calculate distance from globalWeights
    const distances = updates.map((u) => FederatedAlgorithms.computeDistance(u.gradients, globalWeights));
    const meanDist = distances.reduce((s, d) => s + d, 0) / distances.length;

    const results: PoisoningAnalysisResult[] = [];

    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      const norm = norms[i];
      const dist = distances[i];
      const reasons: string[] = [];
      let isPoisoned = false;

      // 1. Z-Score anomaly on L2 Norm
      const zScoreNorm = stdDev > 1e-6 ? Math.abs(norm - meanNorm) / stdDev : 0;
      if (zScoreNorm > thresholdZScore) {
        isPoisoned = true;
        reasons.push(`Gradient L2 norm z-score (${zScoreNorm.toFixed(2)}) exceeds threshold`);
      }

      // 2. Extreme Distance Check
      if (meanDist > 0 && dist > meanDist * 3.0) {
        isPoisoned = true;
        reasons.push(`Distance from global weights (${dist.toFixed(2)}) is >3x cohort mean`);
      }

      // 3. Loss/Accuracy inverted anomalies
      if (u.localLoss > 10.0 || u.localAccuracy < 0.1) {
        isPoisoned = true;
        reasons.push(`Extreme local loss (${u.localLoss}) or collapsed accuracy (${u.localAccuracy})`);
      }

      const anomalyScore = Math.min(1.0, (zScoreNorm / 5.0) * 0.5 + (dist / (meanDist * 3 || 1)) * 0.5);

      results.push({
        nodeId: u.nodeId,
        isPoisoned,
        anomalyScore: Number(anomalyScore.toFixed(3)),
        reasons,
      });
    }

    return results;
  }
}
