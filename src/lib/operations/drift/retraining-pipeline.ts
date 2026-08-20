import { ModelDriftSummary, RetrainingTriggerResult } from './drift-types';
import { FederatedAggregationServer } from '../federated/fed-aggregation-server';
import { PrivacyBudgetManager } from '../privacy/privacy-budget-manager';

/**
 * Autonomous Self-Healing Retraining Pipeline
 */
export class RetrainingPipeline {
  private server: FederatedAggregationServer;
  private budgetManager: PrivacyBudgetManager;

  constructor(server: FederatedAggregationServer, budgetManager: PrivacyBudgetManager) {
    this.server = server;
    this.budgetManager = budgetManager;
  }

  /**
   * Evaluate drift summary and trigger automated retraining round if indicated
   */
  public evaluateAndTrigger(
    driftSummary: ModelDriftSummary,
    tenantId: string = 'global'
  ): RetrainingTriggerResult {
    const triggerId = `trigger_${driftSummary.modelId}_${Date.now()}`;

    if (!driftSummary.retrainingRecommended) {
      return {
        triggerId,
        modelId: driftSummary.modelId,
        triggered: false,
        reason: 'Model distribution is stable (no significant drift detected)',
        privacyBudgetChecked: true,
        status: 'REJECTED',
      };
    }

    // Check privacy budget availability (e.g. 0.5 epsilon needed for retraining round)
    const requiredEps = 0.5;
    const hasBudget = this.budgetManager.checkBudget(tenantId, requiredEps);

    if (!hasBudget) {
      return {
        triggerId,
        modelId: driftSummary.modelId,
        triggered: false,
        reason: `Privacy budget exhausted for tenant ${tenantId}, retraining halted`,
        privacyBudgetChecked: false,
        status: 'REJECTED',
      };
    }

    const model = this.server.getModel(driftSummary.modelId);
    if (!model) {
      return {
        triggerId,
        modelId: driftSummary.modelId,
        triggered: false,
        reason: `Model not found: ${driftSummary.modelId}`,
        privacyBudgetChecked: true,
        status: 'REJECTED',
      };
    }

    // Set model status to training
    model.status = 'training';

    return {
      triggerId,
      modelId: driftSummary.modelId,
      triggered: true,
      reason: `Significant drift detected across ${driftSummary.driftedFeatureCount} features (PSI: ${driftSummary.overallPsi})`,
      roundInitiated: model.currentRound + 1,
      privacyBudgetChecked: true,
      status: 'QUEUED',
    };
  }
}
