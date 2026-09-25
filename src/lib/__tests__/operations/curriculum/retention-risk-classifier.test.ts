import { RetentionRiskClassifier } from '../../../operations/curriculum/retention/retention-risk-classifier';
import { RiskFeatureExtractor } from '../../../operations/curriculum/retention/risk-feature-extractor';

describe('Student Retention Risk ML Classifier (ADVISE-010)', () => {
  const extractor = new RiskFeatureExtractor();
  const classifier = new RetentionRiskClassifier();

  it('should identify high risk students with low GPA, negative velocity, and course drops', () => {
    const features = extractor.extractFeatures(
      'stud_at_risk',
      1.75, // Low GPA
      2.80, // Prior term GPA -> delta = -1.05
      2,    // 2 Course drops
      1,    // 1 Prereq failure
      65,   // 65% attendance
      6,    // 6 days LMS delay
      12
    );

    const prediction = classifier.predictRisk(features);

    expect(prediction.isAtRisk).toBe(true);
    expect(prediction.riskTier).toBe('critical');
    expect(prediction.riskScore).toBeGreaterThan(0.7);
    expect(prediction.topRiskFactors.length).toBeGreaterThanOrEqual(3);
    expect(prediction.recommendedInterventions).toContain('Enroll in Academic Recovery probation triage');
  });

  it('should classify on-track high-performing students as low risk', () => {
    const features = extractor.extractFeatures(
      'stud_honor',
      3.85,
      3.80, // Velocity = +0.05
      0,
      0,
      95,
      0,
      16
    );

    const prediction = classifier.predictRisk(features);

    expect(prediction.isAtRisk).toBe(false);
    expect(prediction.riskTier).toBe('low');
    expect(prediction.riskScore).toBeLessThan(0.25);
  });
});
