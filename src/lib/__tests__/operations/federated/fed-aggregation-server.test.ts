import { FederatedAggregationServer } from '@/lib/operations/federated/fed-aggregation-server';
import { FederatedModelMetadata, ClientGradientUpdate } from '@/lib/operations/federated/federated-types';

describe('FederatedAggregationServer', () => {
  let server: FederatedAggregationServer;

  beforeEach(() => {
    server = new FederatedAggregationServer();
  });

  const modelMeta: FederatedModelMetadata = {
    modelId: 'retention_model_2026',
    name: 'Student Retention Predictor',
    domain: 'retention',
    version: '1.0.0',
    architecture: 'logistic_regression',
    inputDimensions: 4,
    outputDimensions: 1,
    featureNames: ['gpa', 'attendance_pct', 'lms_hours', 'fee_status'],
    targetName: 'retained',
    hyperparameters: {
      learningRate: 0.01,
      batchSize: 32,
      localEpochs: 5,
      proximalMu: 0.05,
    },
    currentRound: 0,
    status: 'initialized',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should register a new global model and create initial checkpoint', () => {
    server.registerModel(modelMeta, [0.1, 0.2, 0.3, 0.4]);
    const model = server.getModel('retention_model_2026');
    expect(model).toBeDefined();
    expect(model?.name).toBe('Student Retention Predictor');

    const latest = server.getLatestWeights('retention_model_2026');
    expect(latest).toBeDefined();
    expect(latest?.roundNumber).toBe(0);
    expect(latest?.weights).toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it('should execute aggregation rounds and increment round numbers', () => {
    server.registerModel(modelMeta, [0.0, 0.0, 0.0, 0.0]);

    const updates: ClientGradientUpdate[] = [
      {
        nodeId: 'node_1',
        campusId: 'campus_main',
        modelId: 'retention_model_2026',
        roundNumber: 1,
        sampleCount: 500,
        gradients: [0.2, 0.4, 0.1, 0.3],
        localLoss: 0.28,
        localAccuracy: 0.89,
        dpEpsilonSpent: 0.1,
        checksum: 'h1',
        timestamp: new Date().toISOString(),
      },
      {
        nodeId: 'node_2',
        campusId: 'campus_city',
        modelId: 'retention_model_2026',
        roundNumber: 1,
        sampleCount: 500,
        gradients: [0.4, 0.2, 0.3, 0.1],
        localLoss: 0.22,
        localAccuracy: 0.91,
        dpEpsilonSpent: 0.1,
        checksum: 'h2',
        timestamp: new Date().toISOString(),
      },
    ];

    const summary = server.aggregateRound('retention_model_2026', updates, { algorithm: 'FedAvg' });
    expect(summary.roundNumber).toBe(1);
    expect(summary.totalSamples).toBe(1000);
    expect(summary.globalLoss).toBeCloseTo(0.25, 3);
    expect(summary.globalAccuracy).toBeCloseTo(0.90, 3);

    const latest = server.getLatestWeights('retention_model_2026');
    expect(latest?.roundNumber).toBe(1);
    expect(latest?.weights[0]).toBeCloseTo(0.3, 3); // (0.2 + 0.4)/2
  });
});
