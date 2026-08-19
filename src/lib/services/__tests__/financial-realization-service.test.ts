import { FinancialRealizationService } from "../financial-realization-service";

jest.mock("../predictive-budget-engine", () => {
  return {
    PredictiveBudgetEngine: {
      forecastMultiCampus: jest.fn().mockResolvedValue({
        forecasts: [
          {
            campusId: "inst_101",
            targetBudgetAmount: 500000,
            forecastP50: 420000,
            realizationDeficitPercent: 16.0,
            riskLevel: "critical_deficit",
          },
        ],
        totalCampuses: 1,
        criticalDeficitCount: 1,
        totalExecutionTimeMs: 12,
      }),
    },
  };
});

describe("FinancialRealizationService", () => {
  it("serves multi-campus financial realization forecasts", async () => {
    const data = await FinancialRealizationService.getRealizationForecast({ campusId: "inst_101", horizonDays: 90 });
    expect(data).toBeDefined();
    expect(data.results).toBeDefined();
  });
});
