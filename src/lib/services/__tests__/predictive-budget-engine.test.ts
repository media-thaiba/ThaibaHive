import { PredictiveBudgetEngine } from "../predictive-budget-engine";

jest.mock("@thaiba/db", () => {
  return {
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ targetBudgetAmount: 500000.0, baselineVelocity: 0.82 }),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(true),
      }),
    },
    financialBudgetModels: { institutionId: "institutionId", createdAt: "createdAt" },
    financialForecastRuns: {},
  };
});

describe("PredictiveBudgetEngine", () => {
  it("models financial trajectory with P10/P50/P90 confidence range", async () => {
    const result = await PredictiveBudgetEngine.forecastInstitutionBudget("campus_101", 90);

    expect(result.horizonDays).toBe(90);
    expect(result.forecastP10).toBeLessThanOrEqual(result.forecastP50);
    expect(result.forecastP50).toBeLessThanOrEqual(result.forecastP90);
  });

  it("forecasts multi-campus realization across network", async () => {
    const summary = await PredictiveBudgetEngine.forecastMultiCampus(["campus_101", "campus_102"], 60);

    expect(summary.totalCampuses).toBe(2);
    expect(summary.forecasts).toHaveLength(2);
  });
});
