import { FeatureContributionAnalyzer } from '@/lib/operations/drift/feature-contribution-analyzer';

describe('FeatureContributionAnalyzer (Drift Attribution & SHAP Decomposition)', () => {
  it('should decompose model drift into per-feature percentage contributions and identify top drivers', () => {
    const featureNames = ['gpa', 'attendance_rate', 'lms_activity', 'parent_income', 'term_credit_load'];
    const baseline = [
      [3.5, 0.95, 20, 50000, 15],
      [3.4, 0.92, 18, 48000, 16],
      [3.6, 0.97, 22, 52000, 14],
    ];
    const shifted = [
      [3.5, 0.55, 19, 51000, 15], // Heavy drop in attendance_rate
      [3.4, 0.52, 17, 49000, 16],
      [3.6, 0.58, 21, 53000, 14],
    ];

    const report = FeatureContributionAnalyzer.analyzeFeatureContributions(
      'afed_retention_v1',
      featureNames,
      baseline,
      shifted
    );

    expect(report.modelId).toBe('afed_retention_v1');
    expect(report.topDrivers[0]).toBe('attendance_rate');
    expect(report.featureShifts.length).toBe(5);
    expect(report.featureShifts[0].contributionPercentage).toBeGreaterThan(50);
    expect(report.diagnosticSummary).toContain('attendance_rate');
  });
});
