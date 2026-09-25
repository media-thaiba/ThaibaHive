import { EarlyInterventionWorkflow } from '../../../operations/curriculum/retention/early-intervention-workflow';
import { RiskFeatureExtractor } from '../../../operations/curriculum/retention/risk-feature-extractor';
import { curriculumStore } from '../../../db/curriculum-store';

describe('Automated Early Intervention Workflow & EngageOS Trigger (ADVISE-011)', () => {
  const extractor = new RiskFeatureExtractor();
  const workflow = new EarlyInterventionWorkflow();

  beforeEach(() => {
    curriculumStore.clearMemoryStore();
  });

  it('should automatically trigger intervention outreach for at-risk student and save alert', async () => {
    const atRiskFeatures = extractor.extractFeatures(
      'stud_intervene_1',
      1.80,
      2.50,
      1,
      1,
      68,
      4,
      12
    );

    const result = await workflow.evaluateAndTrigger(
      atRiskFeatures,
      'Jordan Lee',
      'jordan.lee@thaibahive.edu',
      'email',
      'inst_alpha'
    );

    expect(result.isInterventionDispatched).toBe(true);
    expect(result.alert).toBeDefined();
    expect(result.alert?.studentId).toBe('stud_intervene_1');
    expect(result.alert?.engageOsDispatched).toBe(true);

    const persistedAlerts = await curriculumStore.listRetentionAlerts('inst_alpha');
    expect(persistedAlerts).toHaveLength(1);
    expect(persistedAlerts[0].studentId).toBe('stud_intervene_1');
  });

  it('should not dispatch intervention when student is performing well', async () => {
    const safeFeatures = extractor.extractFeatures(
      'stud_safe_1',
      3.50,
      3.40,
      0,
      0,
      95,
      0,
      15
    );

    const result = await workflow.evaluateAndTrigger(
      safeFeatures,
      'Taylor Smith',
      'taylor.smith@thaibahive.edu',
      'email',
      'inst_alpha'
    );

    expect(result.isInterventionDispatched).toBe(false);
    expect(result.alert).toBeUndefined();
  });
});
