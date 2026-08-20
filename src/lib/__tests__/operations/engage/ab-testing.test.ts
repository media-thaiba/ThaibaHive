import { AbTestingEngine } from '@/lib/operations/engage/ab-testing';

describe('EngageOS Multi-Armed Bandit A/B Testing & Z-Test Suite', () => {
  let abEngine: AbTestingEngine;

  beforeEach(() => {
    abEngine = AbTestingEngine.getInstance();
  });

  it('should deterministically assign recipients to experiment variants', () => {
    abEngine.registerExperiment('exp_cta_test', [
      { variantId: 'v_red_button', name: 'Red Button', trafficWeight: 0.5 },
      { variantId: 'v_green_button', name: 'Green Button', trafficWeight: 0.5 },
    ]);

    const assignment1 = abEngine.assignVariant('exp_cta_test', 'student_123');
    const assignment2 = abEngine.assignVariant('exp_cta_test', 'student_123');

    expect(assignment1).toBeDefined();
    expect(assignment1?.variantId).toBe(assignment2?.variantId);
  });

  it('should evaluate statistical significance via two-proportion Z-test for N >= 100', () => {
    abEngine.registerExperiment('exp_email_subject', [
      { variantId: 'v_urgent', name: 'Urgent Alert', trafficWeight: 0.5 },
      { variantId: 'v_friendly', name: 'Friendly Reminder', trafficWeight: 0.5 },
    ]);

    // Record 100 impressions for variant A (45 conversions = 45% CR)
    abEngine.recordImpression('exp_email_subject', 'v_urgent', 100);
    abEngine.recordConversion('exp_email_subject', 'v_urgent', 45);

    // Record 100 impressions for variant B (10 conversions = 10% CR)
    abEngine.recordImpression('exp_email_subject', 'v_friendly', 100);
    abEngine.recordConversion('exp_email_subject', 'v_friendly', 10);

    const res = abEngine.evaluateExperiment('exp_email_subject');
    expect(res).toBeDefined();
    expect(res?.winningVariantId).toBe('v_urgent');
    expect(res?.pValue).toBeLessThan(0.05);
    expect(res?.isSignificant).toBe(true);
  });
});
