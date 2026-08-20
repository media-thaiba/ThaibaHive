import { ByzantineDefense } from '@/lib/operations/federated/byzantine-defense';
import { ClientGradientUpdate } from '@/lib/operations/federated/federated-types';

describe('ByzantineDefense (Krum, Multi-Krum, Coordinate Median, Trimmed Mean)', () => {
  const benignUpdates: ClientGradientUpdate[] = [
    {
      nodeId: 'node_1',
      campusId: 'c1',
      modelId: 'm1',
      roundNumber: 1,
      sampleCount: 100,
      gradients: [0.51, 0.49, 0.50],
      localLoss: 0.2,
      localAccuracy: 0.9,
      dpEpsilonSpent: 0.1,
      checksum: 'c1',
      timestamp: new Date().toISOString(),
    },
    {
      nodeId: 'node_2',
      campusId: 'c2',
      modelId: 'm1',
      roundNumber: 1,
      sampleCount: 100,
      gradients: [0.49, 0.52, 0.48],
      localLoss: 0.22,
      localAccuracy: 0.89,
      dpEpsilonSpent: 0.1,
      checksum: 'c2',
      timestamp: new Date().toISOString(),
    },
    {
      nodeId: 'node_3',
      campusId: 'c3',
      modelId: 'm1',
      roundNumber: 1,
      sampleCount: 100,
      gradients: [0.50, 0.50, 0.51],
      localLoss: 0.19,
      localAccuracy: 0.92,
      dpEpsilonSpent: 0.1,
      checksum: 'c3',
      timestamp: new Date().toISOString(),
    },
  ];

  const maliciousUpdate: ClientGradientUpdate = {
    nodeId: 'node_byzantine',
    campusId: 'c_bad',
    modelId: 'm1',
    roundNumber: 1,
    sampleCount: 100,
    gradients: [99.0, -100.0, 50.0], // Extreme poisoning vector
    localLoss: 15.0,
    localAccuracy: 0.05,
    dpEpsilonSpent: 0.1,
    checksum: 'c_bad',
    timestamp: new Date().toISOString(),
  };

  const allUpdates = [...benignUpdates, maliciousUpdate];

  it('should filter malicious updates using Krum aggregation', () => {
    const { selectedUpdate, filteredNodeIds } = ByzantineDefense.krum(allUpdates, 1);
    expect(selectedUpdate.nodeId).not.toBe('node_byzantine');
    expect(filteredNodeIds).toContain('node_byzantine');
  });

  it('should aggregate updates using Coordinate-wise Median resisting extreme outliers', () => {
    const { aggregatedWeights } = ByzantineDefense.coordinateMedian(allUpdates);
    // Values for dim 0: [0.49, 0.50, 0.51, 99.0] -> Median is around 0.505
    expect(aggregatedWeights[0]).toBeCloseTo(0.505, 2);
    expect(aggregatedWeights[1]).toBeCloseTo(0.495, 2);
  });

  it('should aggregate updates using Trimmed Mean cutting top and bottom values', () => {
    const { aggregatedWeights } = ByzantineDefense.trimmedMean(allUpdates, 0.25);
    expect(aggregatedWeights[0]).toBeLessThan(1.0);
    expect(aggregatedWeights[1]).toBeGreaterThan(-1.0);
  });
});
