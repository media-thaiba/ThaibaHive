import { FederatedAggregationServer } from '@/lib/operations/federated/fed-aggregation-server';
import { FederatedClientWorker } from '@/lib/operations/federated/fed-client-worker';
import { DifferentialPrivacyEngine } from '@/lib/operations/privacy/differential-privacy-engine';
import { SecureAggregationProtocol } from '@/lib/operations/crypto/secure-aggregation';
import { MaskingVectorEngine } from '@/lib/operations/crypto/masking-vector-engine';
import { ZkGradientVerifier } from '@/lib/operations/crypto/zk-gradient-verifier';
import { StatisticalDriftDetector } from '@/lib/operations/drift/statistical-drift-detector';
import { EdgeInferenceEngine } from '@/lib/operations/inference/edge-inference-engine';
import { CrossCampusBenchmarker } from '@/lib/operations/analytics/cross-campus-benchmarker';

describe('A-FED End-to-End Orchestration Workflow', () => {
  it('should complete full 8-stage lifecycle from local training to cross-campus benchmarking', () => {
    // 1. Register model
    const server = new FederatedAggregationServer();
    const modelId = 'afed_e2e_model';
    server.registerModel(
      {
        modelId,
        name: 'E2E Retention Model',
        domain: 'retention',
        version: '1.0.0',
        architecture: 'logistic_regression',
        inputDimensions: 4,
        outputDimensions: 1,
        featureNames: ['f1', 'f2', 'f3', 'f4'],
        targetName: 'retained',
        hyperparameters: { learningRate: 0.05, batchSize: 32, localEpochs: 2 },
        currentRound: 0,
        status: 'initialized',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [0.5, 0.5, 0.5, 0.5]
    );

    // 2. Local Training on Edge Nodes
    const worker1 = new FederatedClientWorker('node_campus_1', 'campus_1');
    const worker2 = new FederatedClientWorker('node_campus_2', 'campus_2');

    const update1 = worker1.trainLocalEpochs(
      {
        modelId,
        roundNumber: 1,
        weights: [0.5, 0.5, 0.5, 0.5],
        dimensions: [4, 1],
        checksum: 'chk_init',
        timestamp: new Date().toISOString(),
      },
      { features: [[0.5, 0.5, 0.5, 0.5]], labels: [1] },
      1,
      0.05
    );

    const update2 = worker2.trainLocalEpochs(
      {
        modelId,
        roundNumber: 1,
        weights: [0.5, 0.5, 0.5, 0.5],
        dimensions: [4, 1],
        checksum: 'chk_init',
        timestamp: new Date().toISOString(),
      },
      { features: [[0.5, 0.5, 0.5, 0.5]], labels: [1] },
      1,
      0.05
    );

    // 3. Differential Privacy & zk-SNARK proof
    const dpGrads1 = DifferentialPrivacyEngine.perturbVector(update1.gradients, {
      epsilon: 1.0,
      delta: 1e-5,
      sensitivity: 1.0,
      mechanism: 'laplace',
    });
    const dpGrads2 = DifferentialPrivacyEngine.perturbVector(update2.gradients, {
      epsilon: 1.0,
      delta: 1e-5,
      sensitivity: 1.0,
      mechanism: 'laplace',
    });

    const proof1 = ZkGradientVerifier.generateProof('node_campus_1', modelId, 1, dpGrads1, 10.0);
    expect(ZkGradientVerifier.verifyProof(proof1)).toBe(true);

    // 4. SMPC Secure Aggregation
    const secAgg = new SecureAggregationProtocol();
    const participants = ['node_campus_1', 'node_campus_2'];
    secAgg.initSession('smpc_e2e_session', modelId, 1, participants, 2);
    const masked1 = MaskingVectorEngine.maskVector(dpGrads1, 'node_campus_1', participants, 1);
    expect(masked1.length).toBe(4);

    // 5. Server FedAvg Aggregation
    const roundResult = server.aggregateRound(
      modelId,
      [
        {
          nodeId: 'node_campus_1',
          campusId: 'campus_1',
          modelId,
          roundNumber: 1,
          gradients: dpGrads1,
          sampleCount: 100,
          localLoss: 0.4,
          localAccuracy: 0.88,
          dpEpsilonSpent: 1.0,
          checksum: 'chk_1',
          timestamp: new Date().toISOString(),
        },
        {
          nodeId: 'node_campus_2',
          campusId: 'campus_2',
          modelId,
          roundNumber: 1,
          gradients: dpGrads2,
          sampleCount: 100,
          localLoss: 0.35,
          localAccuracy: 0.9,
          dpEpsilonSpent: 1.0,
          checksum: 'chk_2',
          timestamp: new Date().toISOString(),
        },
      ],
      { algorithm: 'FedAvg' }
    );
    expect(roundResult.globalAccuracy).toBe(0.89);

    // 6. Drift Monitor Evaluation
    const driftReport = StatisticalDriftDetector.evaluateFeature(
      'gpa',
      [3.5, 3.2, 3.8],
      [3.4, 3.3, 3.7]
    );
    expect(driftReport.ksStatistic).toBeGreaterThanOrEqual(0);
    expect(driftReport.featureName).toBe('gpa');

    // 7. Edge Quantized Inference
    const inferenceEngine = new EdgeInferenceEngine();
    inferenceEngine.loadModel({
      modelId,
      version: '1.0.0',
      quantizationFormat: 'FP32',
      inputDim: 4,
      outputDim: 1,
      weights: [0.8, 0.9, 0.7, 0.95],
      biases: [-0.5],
    });
    const prediction = inferenceEngine.predict(modelId, [0.8, 0.9, 0.7, 0.95]);
    expect(prediction.predictedClass).toBeDefined();

    // 8. Cross-Campus Benchmarks
    const rankResults = CrossCampusBenchmarker.computeConfidentialBenchmarking([
      {
        campusId: 'campus_1',
        campusName: 'Alpha Campus',
        totalStudents: 1000,
        retainedStudents: 920,
        graduatedStudents: 850,
        facultyCount: 80,
        totalExpenditureDollars: 12000000,
        energyKwhPerSqMeter: 50,
        averageGpa: 3.5,
        timestamp: new Date().toISOString(),
      },
    ]);
    expect(rankResults[0].metrics.retentionRatePercent).toBe(92.0);
  });
});
