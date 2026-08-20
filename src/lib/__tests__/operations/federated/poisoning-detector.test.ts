import { PoisoningDetector } from '@/lib/operations/federated/poisoning-detector';
import { ClientGradientUpdate } from '@/lib/operations/federated/federated-types';

describe('PoisoningDetector', () => {
  const globalWeights = [0.5, 0.5, 0.5];

  const updates: ClientGradientUpdate[] = [
    {
      nodeId: 'node_good_1',
      campusId: 'c1',
      modelId: 'm1',
      roundNumber: 1,
      sampleCount: 100,
      gradients: [0.52, 0.48, 0.51],
      localLoss: 0.2,
      localAccuracy: 0.9,
      dpEpsilonSpent: 0.1,
      checksum: 'c1',
      timestamp: new Date().toISOString(),
    },
    {
      nodeId: 'node_good_2',
      campusId: 'c2',
      modelId: 'm1',
      roundNumber: 1,
      sampleCount: 100,
      gradients: [0.49, 0.51, 0.50],
      localLoss: 0.21,
      localAccuracy: 0.91,
      dpEpsilonSpent: 0.1,
      checksum: 'c2',
      timestamp: new Date().toISOString(),
    },
    {
      nodeId: 'node_poison',
      campusId: 'c3',
      modelId: 'm1',
      roundNumber: 1,
      sampleCount: 100,
      gradients: [50.0, -80.0, 100.0],
      localLoss: 25.0,
      localAccuracy: 0.02,
      dpEpsilonSpent: 0.1,
      checksum: 'c3',
      timestamp: new Date().toISOString(),
    },
  ];

  it('should flag poisoned gradient updates with high anomaly score and reasons', () => {
    const results = PoisoningDetector.analyzeUpdates(updates, globalWeights);
    expect(results.length).toBe(3);

    const poisonRes = results.find((r) => r.nodeId === 'node_poison');
    expect(poisonRes).toBeDefined();
    expect(poisonRes?.isPoisoned).toBe(true);
    expect(poisonRes?.anomalyScore).toBeGreaterThan(0.5);
    expect(poisonRes?.reasons.length).toBeGreaterThan(0);

    const goodRes = results.find((r) => r.nodeId === 'node_good_1');
    expect(goodRes?.isPoisoned).toBe(false);
  });
});
