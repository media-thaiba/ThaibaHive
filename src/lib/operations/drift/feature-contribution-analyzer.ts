export interface FeatureImportanceShift {
  featureName: string;
  baselineImportance: number;
  currentImportance: number;
  importanceDelta: number;
  klDivergence: number;
  contributionPercentage: number;
}

export interface FeatureContributionReport {
  modelId: string;
  timestamp: string;
  topDrivers: string[];
  featureShifts: FeatureImportanceShift[];
  diagnosticSummary: string;
  primaryAttributionCategory: 'demographic' | 'curriculum' | 'seasonal' | 'unspecified';
}

export class FeatureContributionAnalyzer {
  /**
   * Computes feature contribution shifts and decomposes model drift into per-feature percentages
   */
  public static analyzeFeatureContributions(
    modelId: string,
    featureNames: string[],
    baselineDistribution: number[][],
    currentDistribution: number[][],
    baselineWeights?: number[],
    currentWeights?: number[]
  ): FeatureContributionReport {
    const featureCount = featureNames.length;
    const featureShifts: FeatureImportanceShift[] = [];
    let totalDivergenceSum = 0;

    const rawDivergences: { name: string; kl: number; baseImp: number; currImp: number }[] = [];

    for (let i = 0; i < featureCount; i++) {
      const baseVals = baselineDistribution.map((row) => row[i] ?? 0);
      const currVals = currentDistribution.map((row) => row[i] ?? 0);

      const baseMean = baseVals.reduce((a, b) => a + b, 0) / (baseVals.length || 1);
      const currMean = currVals.reduce((a, b) => a + b, 0) / (currVals.length || 1);
      const baseStd = Math.sqrt(
        baseVals.reduce((a, b) => a + Math.pow(b - baseMean, 2), 0) / (baseVals.length || 1)
      ) || 1e-4;
      const currStd = Math.sqrt(
        currVals.reduce((a, b) => a + Math.pow(b - currMean, 2), 0) / (currVals.length || 1)
      ) || 1e-4;

      // KL divergence approximation for Gaussians: ln(s2/s1) + (s1^2 + (m1 - m2)^2)/(2*s2^2) - 1/2
      const kl = Math.max(
        0,
        Math.log(currStd / baseStd) +
          (Math.pow(baseStd, 2) + Math.pow(baseMean - currMean, 2)) / (2 * Math.pow(currStd, 2)) -
          0.5
      );

      const baseImp = Math.abs(baselineWeights?.[i] ?? 1.0);
      const currImp = Math.abs(currentWeights?.[i] ?? 1.0);

      const weightedDivergence = kl * currImp;
      totalDivergenceSum += weightedDivergence;

      rawDivergences.push({
        name: featureNames[i],
        kl,
        baseImp,
        currImp,
      });
    }

    // Compute contribution percentages
    for (const item of rawDivergences) {
      const weightedDiv = item.kl * item.currImp;
      const contributionPercentage = totalDivergenceSum > 0 ? (weightedDiv / totalDivergenceSum) * 100 : 0;

      featureShifts.push({
        featureName: item.name,
        baselineImportance: item.baseImp,
        currentImportance: item.currImp,
        importanceDelta: item.currImp - item.baseImp,
        klDivergence: Number(item.kl.toFixed(4)),
        contributionPercentage: Number(contributionPercentage.toFixed(2)),
      });
    }

    // Sort by contribution percentage descending
    featureShifts.sort((a, b) => b.contributionPercentage - a.contributionPercentage);

    const topDrivers = featureShifts.slice(0, 3).map((f) => f.featureName);

    // Primary attribution category heuristics
    let primaryCategory: 'demographic' | 'curriculum' | 'seasonal' | 'unspecified' = 'unspecified';
    const topFeature = topDrivers[0]?.toLowerCase() ?? '';
    if (topFeature.includes('attendance') || topFeature.includes('term') || topFeature.includes('month')) {
      primaryCategory = 'seasonal';
    } else if (topFeature.includes('gpa') || topFeature.includes('grade') || topFeature.includes('exam')) {
      primaryCategory = 'curriculum';
    } else if (topFeature.includes('income') || topFeature.includes('age') || topFeature.includes('gender')) {
      primaryCategory = 'demographic';
    }

    const diagnosticSummary = `Model [${modelId}] drift is primarily driven by features [${topDrivers.join(
      ', '
    )}] accounting for ${featureShifts
      .slice(0, 3)
      .reduce((acc, f) => acc + f.contributionPercentage, 0)
      .toFixed(1)}% of total distribution divergence. Category identified as ${primaryCategory}.`;

    return {
      modelId,
      timestamp: new Date().toISOString(),
      topDrivers,
      featureShifts,
      diagnosticSummary,
      primaryAttributionCategory: primaryCategory,
    };
  }
}
