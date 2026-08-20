import { FeatureDistribution, ModelDriftSummary } from './drift-types';
import { StatisticalDriftDetector } from './statistical-drift-detector';

/**
 * Covariate Shift Monitor aggregating multi-feature drift across institutional demographics
 */
export class CovariateShiftMonitor {
  /**
   * Evaluate drift across all features for a model
   */
  public static evaluateModelDrift(
    modelId: string,
    features: FeatureDistribution[]
  ): ModelDriftSummary {
    const reports = features.map((f) =>
      StatisticalDriftDetector.evaluateFeature(f.featureName, f.baselineValues, f.currentValues)
    );

    const totalFeatures = reports.length;
    const driftedFeatures = reports.filter((r) => r.isDrifted);
    const avgPsi = totalFeatures > 0 ? reports.reduce((s, r) => s + r.psiScore, 0) / totalFeatures : 0;
    const maxKs = totalFeatures > 0 ? Math.max(...reports.map((r) => r.ksStatistic)) : 0;

    const hasSignificantDrift = reports.some((r) => r.driftSeverity === 'SIGNIFICANT') || avgPsi > 0.15;
    const retrainingRecommended = hasSignificantDrift || driftedFeatures.length >= Math.ceil(totalFeatures * 0.4);

    return {
      modelId,
      overallPsi: Number(avgPsi.toFixed(4)),
      maxFeatureKs: Number(maxKs.toFixed(4)),
      driftedFeatureCount: driftedFeatures.length,
      totalFeatures,
      hasSignificantDrift,
      featureReports: reports,
      retrainingRecommended,
      timestamp: new Date().toISOString(),
    };
  }
}
