import { StatisticalDriftDetector } from '@/lib/operations/drift/statistical-drift-detector';
import { CovariateShiftMonitor } from '@/lib/operations/drift/covariate-shift-monitor';

describe('StatisticalDriftDetector & CovariateShiftMonitor', () => {
  const baseline = [10, 12, 11, 13, 12, 14, 11, 10, 12, 13];
  const identicalSample = [10, 12, 11, 13, 12, 14, 11, 10, 12, 13];
  const driftedSample = [25, 28, 30, 32, 29, 31, 28, 27, 30, 33]; // Heavily shifted

  it('should report low KS and PSI for identical or stationary distributions', () => {
    const report = StatisticalDriftDetector.evaluateFeature('test_feat', baseline, identicalSample);
    expect(report.ksStatistic).toBe(0);
    expect(report.psiScore).toBe(0);
    expect(report.driftSeverity).toBe('NONE');
    expect(report.isDrifted).toBe(false);
  });

  it('should detect significant drift on shifted distributions', () => {
    const report = StatisticalDriftDetector.evaluateFeature('lms_hours', baseline, driftedSample);
    expect(report.ksStatistic).toBeGreaterThan(0.5);
    expect(report.psiScore).toBeGreaterThan(0.2);
    expect(report.driftSeverity).toBe('SIGNIFICANT');
    expect(report.isDrifted).toBe(true);
  });

  it('should monitor multi-feature model drift and recommend retraining', () => {
    const summary = CovariateShiftMonitor.evaluateModelDrift('retention_v1', [
      { featureName: 'gpa', baselineValues: baseline, currentValues: driftedSample },
      { featureName: 'attendance', baselineValues: baseline, currentValues: driftedSample },
      { featureName: 'fees', baselineValues: baseline, currentValues: identicalSample },
    ]);

    expect(summary.totalFeatures).toBe(3);
    expect(summary.driftedFeatureCount).toBe(2);
    expect(summary.hasSignificantDrift).toBe(true);
    expect(summary.retrainingRecommended).toBe(true);
  });
});
