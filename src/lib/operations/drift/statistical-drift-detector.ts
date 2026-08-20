import { FeatureDriftReport } from './drift-types';

/**
 * Statistical Drift Detector implementing KS-Test, PSI, and Wasserstein Distance
 */
export class StatisticalDriftDetector {
  /**
   * Two-Sample Kolmogorov-Smirnov (KS) Test
   * Computes D = sup_x |F1(x) - F2(x)|
   */
  public static computeKsTest(
    sampleA: number[],
    sampleB: number[]
  ): { ksStatistic: number; pValue: number } {
    if (!sampleA.length || !sampleB.length) {
      return { ksStatistic: 0, pValue: 1.0 };
    }

    const sortedA = [...sampleA].sort((a, b) => a - b);
    const sortedB = [...sampleB].sort((a, b) => a - b);

    const allValues = Array.from(new Set([...sortedA, ...sortedB])).sort((a, b) => a - b);

    let maxDiff = 0;
    let idxA = 0;
    let idxB = 0;
    const nA = sortedA.length;
    const nB = sortedB.length;

    for (const val of allValues) {
      while (idxA < nA && sortedA[idxA] <= val) idxA++;
      while (idxB < nB && sortedB[idxB] <= val) idxB++;

      const cdfA = idxA / nA;
      const cdfB = idxB / nB;
      const diff = Math.abs(cdfA - cdfB);
      if (diff > maxDiff) {
        maxDiff = diff;
      }
    }

    // Asymptotic p-value approximation for two-sample KS test
    const en = Math.sqrt((nA * nB) / (nA + nB));
    const lambda = (en + 0.12 + 0.11 / en) * maxDiff;
    let pValue = 0;
    if (lambda > 0) {
      // Kolmogorov distribution CDF approximation
      pValue = 2.0 * Math.exp(-2.0 * lambda * lambda);
      pValue = Math.max(0, Math.min(1.0, pValue));
    } else {
      pValue = 1.0;
    }

    return {
      ksStatistic: Number(maxDiff.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
    };
  }

  /**
   * Population Stability Index (PSI)
   * Formula: sum (Actual% - Expected%) * ln(Actual% / Expected%)
   */
  public static computePsi(sampleBaseline: number[], sampleCurrent: number[], numBins: number = 10): number {
    if (!sampleBaseline.length || !sampleCurrent.length) return 0;

    const sortedBase = [...sampleBaseline].sort((a, b) => a - b);
    const minVal = sortedBase[0];
    const maxVal = sortedBase[sortedBase.length - 1];

    if (minVal === maxVal) return 0;

    const binWidth = (maxVal - minVal) / numBins;
    const baseCounts = new Array(numBins).fill(0);
    const currCounts = new Array(numBins).fill(0);

    for (const v of sampleBaseline) {
      const bIdx = Math.min(numBins - 1, Math.max(0, Math.floor((v - minVal) / binWidth)));
      baseCounts[bIdx]++;
    }

    for (const v of sampleCurrent) {
      const bIdx = Math.min(numBins - 1, Math.max(0, Math.floor((v - minVal) / binWidth)));
      currCounts[bIdx]++;
    }

    const nBase = sampleBaseline.length;
    const nCurr = sampleCurrent.length;

    let psi = 0;
    for (let i = 0; i < numBins; i++) {
      // Laplace smoothing to prevent division by zero
      const pBase = Math.max(1e-4, (baseCounts[i] + 1) / (nBase + numBins));
      const pCurr = Math.max(1e-4, (currCounts[i] + 1) / (nCurr + numBins));
      psi += (pCurr - pBase) * Math.log(pCurr / pBase);
    }

    return Number(Math.max(0, psi).toFixed(4));
  }

  /**
   * 1-Dimensional Wasserstein (Earth Mover's) Distance
   */
  public static computeWassersteinDistance(sampleA: number[], sampleB: number[]): number {
    if (!sampleA.length || !sampleB.length) return 0;

    const sortedA = [...sampleA].sort((a, b) => a - b);
    const sortedB = [...sampleB].sort((a, b) => a - b);

    // Interpolate quantiles
    const steps = 100;
    let distance = 0;

    for (let i = 0; i <= steps; i++) {
      const q = i / steps;
      const idxA = Math.min(sortedA.length - 1, Math.floor(q * (sortedA.length - 1)));
      const idxB = Math.min(sortedB.length - 1, Math.floor(q * (sortedB.length - 1)));
      distance += Math.abs(sortedA[idxA] - sortedB[idxB]);
    }

    return Number((distance / (steps + 1)).toFixed(4));
  }

  /**
   * Evaluate complete drift report for a single feature
   */
  public static evaluateFeature(
    featureName: string,
    baseline: number[],
    current: number[]
  ): FeatureDriftReport {
    const { ksStatistic, pValue } = this.computeKsTest(baseline, current);
    const psiScore = this.computePsi(baseline, current);
    const wassersteinDistance = this.computeWassersteinDistance(baseline, current);

    let driftSeverity: 'NONE' | 'LOW' | 'MODERATE' | 'SIGNIFICANT' = 'NONE';
    if (psiScore >= 0.2 || (ksStatistic > 0.3 && pValue < 0.01)) {
      driftSeverity = 'SIGNIFICANT';
    } else if (psiScore >= 0.1 || (ksStatistic > 0.2 && pValue < 0.05)) {
      driftSeverity = 'MODERATE';
    } else if (psiScore > 0.05 || ksStatistic > 0.15) {
      driftSeverity = 'LOW';
    }

    return {
      featureName,
      ksStatistic,
      ksPValue: pValue,
      psiScore,
      wassersteinDistance,
      driftSeverity,
      isDrifted: driftSeverity === 'MODERATE' || driftSeverity === 'SIGNIFICANT',
    };
  }
}
