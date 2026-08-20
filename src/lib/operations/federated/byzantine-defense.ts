import { ClientGradientUpdate } from './federated-types';
import { FederatedAlgorithms } from './fed-algorithms';

/**
 * Byzantine-Resilient Aggregation Defense (Krum, Multi-Krum, Trimmed Mean, Coordinate-wise Median)
 */
export class ByzantineDefense {
  /**
   * Krum Aggregation: Selects the single gradient vector that is closest to its n - f - 2 neighbors.
   * f = estimated number of malicious nodes
   */
  public static krum(
    updates: ClientGradientUpdate[],
    f: number = 1
  ): { selectedUpdate: ClientGradientUpdate; filteredNodeIds: string[] } {
    const n = updates.length;
    if (n <= 2) {
      return { selectedUpdate: updates[0], filteredNodeIds: [] };
    }

    const maxNeighbors = Math.max(1, n - f - 2);
    let bestScore = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < n; i++) {
      const distances: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          distances.push(FederatedAlgorithms.computeDistance(updates[i].gradients, updates[j].gradients));
        }
      }
      distances.sort((a, b) => a - b);
      const score = distances.slice(0, maxNeighbors).reduce((sum, d) => sum + d * d, 0);

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const filtered = updates.filter((_, idx) => idx !== bestIdx).map((u) => u.nodeId);
    return { selectedUpdate: updates[bestIdx], filteredNodeIds: filtered };
  }

  /**
   * Multi-Krum: Selects top-m Krum candidates and averages them
   */
  public static multiKrum(
    updates: ClientGradientUpdate[],
    m: number = 3,
    f: number = 1
  ): { aggregatedWeights: number[]; filteredNodeIds: string[] } {
    const n = updates.length;
    if (n === 0) return { aggregatedWeights: [], filteredNodeIds: [] };
    if (n <= m) {
      const avg = FederatedAlgorithms.fedAvg([], updates);
      return { aggregatedWeights: avg.aggregatedWeights, filteredNodeIds: [] };
    }

    const remaining = [...updates];
    const selected: ClientGradientUpdate[] = [];
    const actualM = Math.min(m, n - f);

    for (let step = 0; step < actualM && remaining.length > 0; step++) {
      const { selectedUpdate } = this.krum(remaining, f);
      selected.push(selectedUpdate);
      const remIdx = remaining.findIndex((u) => u.nodeId === selectedUpdate.nodeId);
      if (remIdx >= 0) remaining.splice(remIdx, 1);
    }

    const avg = FederatedAlgorithms.fedAvg([], selected);
    const selectedIds = new Set(selected.map((s) => s.nodeId));
    const filteredNodeIds = updates.filter((u) => !selectedIds.has(u.nodeId)).map((u) => u.nodeId);

    return { aggregatedWeights: avg.aggregatedWeights, filteredNodeIds };
  }

  /**
   * Coordinate-wise Median Aggregation
   * For each weight dimension, compute the median of all client gradients
   */
  public static coordinateMedian(
    updates: ClientGradientUpdate[]
  ): { aggregatedWeights: number[]; filteredNodeIds: string[] } {
    if (!updates || updates.length === 0) {
      return { aggregatedWeights: [], filteredNodeIds: [] };
    }

    const dim = updates[0].gradients.length;
    const aggregatedWeights = new Array(dim).fill(0);

    for (let d = 0; d < dim; d++) {
      const values = updates.map((u) => u.gradients[d] || 0).sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      if (values.length % 2 === 0) {
        aggregatedWeights[d] = (values[mid - 1] + values[mid]) / 2;
      } else {
        aggregatedWeights[d] = values[mid];
      }
    }

    return { aggregatedWeights, filteredNodeIds: [] };
  }

  /**
   * Trimmed Mean Aggregation
   * For each dimension, sorts values and trims the top & bottom beta fraction
   */
  public static trimmedMean(
    updates: ClientGradientUpdate[],
    beta: number = 0.2
  ): { aggregatedWeights: number[]; filteredNodeIds: string[] } {
    if (!updates || updates.length === 0) {
      return { aggregatedWeights: [], filteredNodeIds: [] };
    }

    const dim = updates[0].gradients.length;
    const n = updates.length;
    const trimCount = Math.floor(n * Math.min(0.45, Math.max(0, beta)));
    const aggregatedWeights = new Array(dim).fill(0);

    for (let d = 0; d < dim; d++) {
      const values = updates.map((u) => u.gradients[d] || 0).sort((a, b) => a - b);
      const trimmed = values.slice(trimCount, n - trimCount);
      const sum = trimmed.reduce((acc, v) => acc + v, 0);
      aggregatedWeights[d] = sum / Math.max(1, trimmed.length);
    }

    return { aggregatedWeights, filteredNodeIds: [] };
  }
}
