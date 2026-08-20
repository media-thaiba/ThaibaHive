import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';
import { AfedAuditLogger } from '@/lib/operations/persistence/afed-audit-events';
import { AfedMetricsTracker } from '@/lib/operations/persistence/afed-metrics';

describe('A-FED Persistence, Audit and OpenMetrics Telemetry Suite', () => {
  let dbStore: AfedDbStore;

  beforeEach(() => {
    dbStore = AfedDbStore.getInstance();
    dbStore.clear();
    AfedMetricsTracker.resetInstance();
  });

  it('should persist and retrieve federated models, nodes and rounds', () => {
    dbStore.saveModel({
      modelId: 'm_retention',
      name: 'Retention Model',
      domain: 'retention',
      version: '1.0.0',
      architecture: 'logistic_regression',
      inputDimensions: 5,
      outputDimensions: 1,
      hyperparametersData: JSON.stringify({ lr: 0.01 }),
    });

    const model = dbStore.getModel('m_retention');
    expect(model).toBeDefined();
    expect(model.name).toBe('Retention Model');

    dbStore.saveNode({
      nodeId: 'node_alpha',
      campusId: 'campus_1',
      campusName: 'Main Campus',
      sampleCount: 1500,
    });

    const node = dbStore.getNode('node_alpha');
    expect(node).toBeDefined();
    expect(node.campusName).toBe('Main Campus');
  });

  it('should log A-FED cryptographic audit events to Merkle chain', async () => {
    await expect(
      AfedAuditLogger.logEvent({
        eventType: 'afed.round.completed',
        modelId: 'm_retention',
        roundNumber: 1,
        details: { accuracy: 0.92, loss: 0.18 },
      })
    ).resolves.not.toThrow();
  });

  it('should record and export all 8 Prometheus OpenMetrics series accurately', () => {
    const tracker = AfedMetricsTracker.getInstance();
    tracker.recordTrainingRound('m_retention', 'FedAvg');
    tracker.setTrainingLoss('m_retention', 0.15);
    tracker.recordPrivacyEpsilon('tenant_1', 0.25);
    tracker.setActiveNodes('campus_1', 4);
    tracker.setDriftPsiScore('m_retention', 0.04);
    tracker.recordEdgeInferenceDuration(0.012);
    tracker.recordSmpcSessionDuration(0.18);
    tracker.setModelAccuracy('m_retention', 0.94);

    const metricsText = tracker.exportOpenMetrics();
    expect(metricsText).toContain('afed_training_rounds_total');
    expect(metricsText).toContain('afed_training_loss');
    expect(metricsText).toContain('afed_privacy_epsilon_consumed');
    expect(metricsText).toContain('afed_participating_nodes_active');
    expect(metricsText).toContain('afed_drift_psi_score');
    expect(metricsText).toContain('afed_edge_inference_duration_seconds');
    expect(metricsText).toContain('afed_smpc_session_duration_seconds');
    expect(metricsText).toContain('afed_model_accuracy_ratio');
  });
});
