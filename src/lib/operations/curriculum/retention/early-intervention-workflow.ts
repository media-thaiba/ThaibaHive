import { curriculumStore } from '../../../db/curriculum-store';
import { CurriculumRetentionAlertDto } from '../curriculum-types';
import { RetentionRiskClassifier } from './retention-risk-classifier';
import { InterventionDispatcher } from './intervention-dispatcher';
import { StudentRetentionFeatures, RetentionPredictionResult } from './retention-types';

export class EarlyInterventionWorkflow {
  private classifier: RetentionRiskClassifier = new RetentionRiskClassifier();
  private dispatcher: InterventionDispatcher = new InterventionDispatcher();

  /**
   * Evaluates student retention risk and triggers automated intervention if at-risk
   */
  public async evaluateAndTrigger(
    features: StudentRetentionFeatures,
    studentName: string = 'Student',
    contact: string = 'student@thaibahive.edu',
    channel: 'email' | 'sms' | 'whatsapp' | 'in_app' = 'email',
    tenantId: string = 'global'
  ): Promise<{ prediction: RetentionPredictionResult; alert?: CurriculumRetentionAlertDto; isInterventionDispatched: boolean }> {
    const prediction = this.classifier.predictRisk(features);

    if (prediction.isAtRisk || prediction.riskScore >= 0.50) {
      const alertId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const primaryReason = prediction.topRiskFactors[0]?.description || 'Academic progression check';

      // 1. Dispatch outreach via EngageOS
      await this.dispatcher.dispatchIntervention(
        alertId,
        features.studentId,
        channel,
        contact,
        studentName,
        primaryReason
      );

      // 2. Persist alert to curriculum store
      const alert = await curriculumStore.createRetentionAlert({
        alertId,
        studentId: features.studentId,
        riskTier: prediction.riskTier,
        riskScore: prediction.riskScore,
        contributingFactorsJson: JSON.stringify(prediction.topRiskFactors),
        recommendedInterventionJson: JSON.stringify(prediction.recommendedInterventions),
        status: 'open',
        engageOsDispatched: true,
        lastContactedAt: new Date().toISOString(),
        institutionId: tenantId,
      });

      return { prediction, alert, isInterventionDispatched: true };
    }

    return { prediction, isInterventionDispatched: false };
  }
}
