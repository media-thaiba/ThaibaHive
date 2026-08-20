import {
  CampusRawIndicatorData,
  ConfidentialCampusPercentileRank,
  IPEDSBenchmarkMetrics,
} from './analytics-types';
import { InstitutionalIndicators } from './institutional-indicators';

/**
 * Privacy-Preserving Cross-Campus Benchmarking Protocol
 */
export class CrossCampusBenchmarker {
  /**
   * Aggregate and calculate confidential percentile ranks across campuses without exposing raw counts
   */
  public static computeConfidentialBenchmarking(
    campusDataList: CampusRawIndicatorData[]
  ): ConfidentialCampusPercentileRank[] {
    if (!campusDataList || campusDataList.length === 0) return [];

    const computedMetrics = campusDataList.map((c) => ({
      campusId: c.campusId,
      campusName: c.campusName,
      metrics: InstitutionalIndicators.calculateMetrics(c),
    }));

    const totalCampuses = computedMetrics.length;

    // Helper for percentile calculation
    const calcPercentile = (values: number[], targetVal: number): number => {
      if (values.length <= 1) return 50.0;
      const countBelow = values.filter((v) => v < targetVal).length;
      return Number(((countBelow / (values.length - 1)) * 100).toFixed(1));
    };

    const allRetention = computedMetrics.map((c) => c.metrics.retentionRatePercent);
    const allGraduation = computedMetrics.map((c) => c.metrics.graduationRatePercent);
    const allSfRatio = computedMetrics.map((c) => c.metrics.studentFacultyRatio);
    const allExpenditure = computedMetrics.map((c) => c.metrics.expenditurePerStudent);
    const allEnergy = computedMetrics.map((c) => c.metrics.energyEfficiencyKwhPerM2);
    const allGpa = computedMetrics.map((c) => c.metrics.averageAcademicGpa);

    // Compute composite score for ranking (higher retention, graduation, GPA, lower SF ratio & energy)
    const ranked = computedMetrics.map((c) => {
      const pRet = calcPercentile(allRetention, c.metrics.retentionRatePercent);
      const pGrad = calcPercentile(allGraduation, c.metrics.graduationRatePercent);
      const pGpa = calcPercentile(allGpa, c.metrics.averageAcademicGpa);
      const pEnergy = 100 - calcPercentile(allEnergy, c.metrics.energyEfficiencyKwhPerM2); // inverted
      const pSf = 100 - calcPercentile(allSfRatio, c.metrics.studentFacultyRatio); // inverted

      const compositeScore = pRet * 0.3 + pGrad * 0.25 + pGpa * 0.2 + pEnergy * 0.15 + pSf * 0.1;

      const percentiles: Record<keyof IPEDSBenchmarkMetrics, number> = {
        retentionRatePercent: pRet,
        graduationRatePercent: pGrad,
        studentFacultyRatio: calcPercentile(allSfRatio, c.metrics.studentFacultyRatio),
        expenditurePerStudent: calcPercentile(allExpenditure, c.metrics.expenditurePerStudent),
        energyEfficiencyKwhPerM2: calcPercentile(allEnergy, c.metrics.energyEfficiencyKwhPerM2),
        averageAcademicGpa: pGpa,
      };

      return {
        campusId: c.campusId,
        campusName: c.campusName,
        metrics: c.metrics,
        percentiles,
        compositeScore,
      };
    });

    ranked.sort((a, b) => b.compositeScore - a.compositeScore);

    return ranked.map((item, idx) => ({
      campusId: item.campusId,
      campusName: item.campusName,
      metrics: item.metrics,
      percentiles: item.percentiles,
      rankPosition: idx + 1,
      totalParticipatingCampuses: totalCampuses,
    }));
  }
}
