import { FeatureDriftReport } from './drift-types';

export interface DriftAttributionResult {
  featureName: string;
  attributionPercentage: number; // 0.0 - 100.0%
  shiftDirection: 'INCREASED' | 'DECREASED' | 'SPREAD_OUT' | 'STABLE';
  summary: string;
}

/**
 * Concept Drift Attribution & Feature Contribution Diagnostics
 */
export class DriftAttribution {
  /**
   * Decomposes total model drift into individual feature contributions
   */
  public static attributeDrift(
    reports: FeatureDriftReport[],
    featureMeansBaseline: Record<string, number>,
    featureMeansCurrent: Record<string, number>
  ): DriftAttributionResult[] {
    const totalPsi = reports.reduce((s, r) => s + r.psiScore, 0);

    return reports.map((r) => {
      const attributionPct = totalPsi > 0 ? (r.psiScore / totalPsi) * 100 : 0;
      const baseMean = featureMeansBaseline[r.featureName] || 0;
      const currMean = featureMeansCurrent[r.featureName] || 0;

      let shiftDirection: 'INCREASED' | 'DECREASED' | 'SPREAD_OUT' | 'STABLE' = 'STABLE';
      if (currMean > baseMean * 1.1) shiftDirection = 'INCREASED';
      else if (currMean < baseMean * 0.9) shiftDirection = 'DECREASED';
      else if (r.isDrifted) shiftDirection = 'SPREAD_OUT';

      return {
        featureName: r.featureName,
        attributionPercentage: Number(attributionPct.toFixed(2)),
        shiftDirection,
        summary: `Feature ${r.featureName} contributes ${attributionPct.toFixed(1)}% to model drift (PSI: ${r.psiScore}). Direction: ${shiftDirection}.`,
      };
    }).sort((a, b) => b.attributionPercentage - a.attributionPercentage);
  }
}
