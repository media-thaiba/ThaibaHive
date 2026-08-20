import { FederatedAlgorithms } from '@/lib/operations/federated/fed-algorithms';
import { ClientGradientUpdate } from '@/lib/operations/federated/federated-types';

describe('FederatedAlgorithms (FedAvg & FedProx)', () => {
  const globalWeights = [0.5, -0.2, 0.8, 0.1];

  const clientUpdates: ClientGradientUpdate[] = [
    {
      nodeId: 'node_alpha',
      campusId: 'campus_1',
      modelId: 'model_retention_v1',
      roundNumber: 1,
      sampleCount: 100,
      gradients: [0.6, -0.1, 0.9, 0.2],
      localLoss: 0.35,
      localAccuracy: 0.88,
      dpEpsilonSpent: 0.1,
      checksum: 'abc1',
      timestamp: new Date().toISOString(),
    },
    {
      nodeId: 'node_beta',
      campusId: 'campus_2',
      modelId: 'model_retention_v1',
      roundNumber: 1,
      sampleCount: 300,
      gradients: [0.4, -0.3, 0.7, 0.0],
      localLoss: 0.25,
      localAccuracy: 0.92,
      dpEpsilonSpent: 0.1,
      checksum: 'abc2',
      timestamp: new Date().toISOString(),
    },
  ];

  it('should compute weighted FedAvg correctly according to sample proportions', () => {
    const result = FederatedAlgorithms.fedAvg(globalWeights, clientUpdates);

    // Total samples = 400. Alpha weight = 0.25, Beta weight = 0.75
    // Dim 0: 0.6 * 0.25 + 0.4 * 0.75 = 0.15 + 0.30 = 0.45
    // Dim 1: -0.1 * 0.25 + -0.3 * 0.75 = -0.025 + -0.225 = -0.25
    expect(result.aggregatedWeights[0]).toBeCloseTo(0.45, 4);
    expect(result.aggregatedWeights[1]).toBeCloseTo(-0.25, 4);
    expect(result.averageLoss).toBeCloseTo(0.35 * 0.25 + 0.25 * 0.75, 4);
    expect(result.averageAccuracy).toBeCloseTo(0.88 * 0.25 + 0.92 * 0.75, 4);
  });

  it('should compute FedProx with proximal regularization adjustment', () => {
    const resultProx = FederatedAlgorithms.fedProx(globalWeights, clientUpdates, 0.1);
    expect(resultProx.aggregatedWeights.length).toBe(4);
    expect(resultProx.averageLoss).toBeGreaterThan(0);
  });

  it('should return initial weights when no client updates are provided', () => {
    const emptyResult = FederatedAlgorithms.fedAvg(globalWeights, []);
    expect(emptyResult.aggregatedWeights).toEqual(globalWeights);
  });

  it('should compute valid SHA-256 checksums and L2 norms', () => {
    const checksum = FederatedAlgorithms.computeChecksum(globalWeights);
    expect(checksum).toHaveLength(64);

    const norm = FederatedAlgorithms.computeL2Norm([3, 4]);
    expect(norm).toBe(5);

    const dist = FederatedAlgorithms.computeDistance([1, 2], [4, 6]);
    expect(dist).toBe(5);
  });
});
