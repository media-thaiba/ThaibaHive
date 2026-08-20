import { FederatedClientWorker, LocalTrainingDataset } from '@/lib/operations/federated/fed-client-worker';
import { ModelWeights } from '@/lib/operations/federated/federated-types';

describe('FederatedClientWorker', () => {
  const initialWeights: ModelWeights = {
    modelId: 'model_1',
    roundNumber: 0,
    weights: [0.1, -0.1, 0.2],
    dimensions: [3, 1],
    checksum: 'ck0',
    timestamp: new Date().toISOString(),
  };

  const dataset: LocalTrainingDataset = {
    features: [
      [1.0, 0.5, 0.2],
      [0.2, 0.8, 0.9],
      [0.9, 0.1, 0.3],
      [0.1, 0.2, 0.1],
    ],
    labels: [1, 0, 1, 0],
  };

  it('should train local epochs using gradient descent and produce valid gradient updates', () => {
    const worker = new FederatedClientWorker('node_client_1', 'campus_north');
    const update = worker.trainLocalEpochs(initialWeights, dataset, 5, 0.1);

    expect(update.nodeId).toBe('node_client_1');
    expect(update.sampleCount).toBe(4);
    expect(update.gradients.length).toBe(3);
    expect(update.localAccuracy).toBeGreaterThanOrEqual(0.5);
    expect(update.localLoss).toBeGreaterThan(0);
    expect(update.checksum).toHaveLength(64);
  });

  it('should handle empty dataset gracefully', () => {
    const worker = new FederatedClientWorker('node_empty', 'campus_empty');
    const update = worker.trainLocalEpochs(initialWeights, { features: [], labels: [] }, 1);
    expect(update.sampleCount).toBe(0);
    expect(update.gradients).toEqual(initialWeights.weights);
  });
});
