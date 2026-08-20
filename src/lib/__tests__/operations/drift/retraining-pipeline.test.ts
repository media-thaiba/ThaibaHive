import { RetrainingPipeline } from '@/lib/operations/drift/retraining-pipeline';
import { ModelPromotionValidator } from '@/lib/operations/drift/model-promotion-validator';
import { DriftAttribution } from '@/lib/operations/drift/drift-attribution';
import { FederatedAggregationServer } from '@/lib/operations/federated/fed-aggregation-server';
import { PrivacyBudgetManager } from '@/lib/operations/privacy/privacy-budget-manager';
import { ModelDriftSummary } from '@/lib/operations/drift/drift-types';

describe('Retraining Pipeline, Model Promotion & Drift Attribution', () => {
  let server: FederatedAggregationServer;
  let budgetManager: PrivacyBudgetManager;
  let pipeline: RetrainingPipeline;

  beforeEach(() => {
    server = new FederatedAggregationServer();
    budgetManager = new PrivacyBudgetManager();
    pipeline = new RetrainingPipeline(server, budgetManager);

    server.registerModel({
      modelId: 'm_retention',
      name: 'Retention Model',
      domain: 'retention',
      version: '1.0.0',
      architecture: 'logistic_regression',
      inputDimensions: 2,
      outputDimensions: 1,
      featureNames: ['f1', 'f2'],
      targetName: 'retained',
      hyperparameters: { learningRate: 0.01, batchSize: 32, localEpochs: 3 },
      currentRound: 5,
      status: 'converged',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('should trigger retraining when significant drift is detected and privacy budget is available', () => {
    budgetManager.initializeBudget('global', 10.0);

    const driftSummary: ModelDriftSummary = {
      modelId: 'm_retention',
      overallPsi: 0.25,
      maxFeatureKs: 0.45,
      driftedFeatureCount: 2,
      totalFeatures: 2,
      hasSignificantDrift: true,
      featureReports: [],
      retrainingRecommended: true,
      timestamp: new Date().toISOString(),
    };

    const trigger = pipeline.evaluateAndTrigger(driftSummary, 'global');
    expect(trigger.triggered).toBe(true);
    expect(trigger.roundInitiated).toBe(6);
    expect(trigger.status).toBe('QUEUED');
  });

  it('should reject retraining when privacy budget is exhausted', () => {
    budgetManager.initializeBudget('global', 0.1);
    budgetManager.consumeBudget('global', 0.1); // exhausted

    const driftSummary: ModelDriftSummary = {
      modelId: 'm_retention',
      overallPsi: 0.35,
      maxFeatureKs: 0.55,
      driftedFeatureCount: 2,
      totalFeatures: 2,
      hasSignificantDrift: true,
      featureReports: [],
      retrainingRecommended: true,
      timestamp: new Date().toISOString(),
    };

    const trigger = pipeline.evaluateAndTrigger(driftSummary, 'global');
    expect(trigger.triggered).toBe(false);
    expect(trigger.status).toBe('REJECTED');
  });

  it('should validate candidate models and reject performance regression', () => {
    const verdict = ModelPromotionValidator.validate(
      'candidate_v2',
      { accuracy: 0.70, f1Score: 0.65, loss: 0.45, latencyMs: 25, demographicDisparityScore: 0.04 },
      { accuracy: 0.90, f1Score: 0.88, loss: 0.15, latencyMs: 25, demographicDisparityScore: 0.04 }
    );

    expect(verdict.isApproved).toBe(false);
    expect(verdict.verdict).toBe('REJECTED_REGRESSION');
  });

  it('should attribute drift percentages across individual features', () => {
    const attributions = DriftAttribution.attributeDrift(
      [
        {
          featureName: 'attendance',
          ksStatistic: 0.4,
          ksPValue: 0.001,
          psiScore: 0.3,
          wassersteinDistance: 5.0,
          driftSeverity: 'SIGNIFICANT',
          isDrifted: true,
        },
        {
          featureName: 'fees',
          ksStatistic: 0.1,
          ksPValue: 0.5,
          psiScore: 0.1,
          wassersteinDistance: 1.0,
          driftSeverity: 'LOW',
          isDrifted: false,
        },
      ],
      { attendance: 85, fees: 100 },
      { attendance: 65, fees: 102 } // attendance shifted down
    );

    expect(attributions.length).toBe(2);
    expect(attributions[0].featureName).toBe('attendance');
    expect(attributions[0].attributionPercentage).toBeCloseTo(75.0, 1);
    expect(attributions[0].shiftDirection).toBe('DECREASED');
  });
});
