import { PredictiveBudgetEngine, FinancialForecastResult } from "./predictive-budget-engine";

export class FinancialRealizationService {
  /**
   * Get financial realization forecast payload for single campus or multi-campus cluster
   */
  static async getRealizationForecast(params: {
    campusId?: string;
    horizonDays?: number;
    confidenceLevel?: number;
  }): Promise<{
    horizonDays: number;
    confidenceLevel: number;
    results: FinancialForecastResult[];
    totalCampuses: number;
    criticalDeficitCount: number;
    summaryText: string;
  }> {
    const horizonDays = params.horizonDays ?? 90;
    const confidenceLevel = params.confidenceLevel ?? 0.95;

    let campusList = ["inst_101", "inst_102", "inst_103"];
    if (params.campusId) {
      campusList = [params.campusId];
    }

    const multi = await PredictiveBudgetEngine.forecastMultiCampus(campusList, horizonDays);

    const summaryText =
      multi.criticalDeficitCount > 0
        ? `Warning: ${multi.criticalDeficitCount} out of ${multi.totalCampuses} campuses project budget realization deficits exceeding 15%.`
        : `All ${multi.totalCampuses} campuses are projecting healthy financial realization within targets.`;

    return {
      horizonDays,
      confidenceLevel,
      results: multi.forecasts,
      totalCampuses: multi.totalCampuses,
      criticalDeficitCount: multi.criticalDeficitCount,
      summaryText,
    };
  }
}
