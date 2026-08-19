

import { StudentRetentionPredictor } from "../predictive/student-retention-predictor";
import { EnrollmentForecastingEngine } from "../predictive/enrollment-forecasting-engine";
import { BudgetScenarioSimulator } from "../simulation/budget-scenario-simulator";

describe("Phase 3 Integration: Predictive Modeling & Scenario Simulation (STREAM-011..015)", () => {
  it("calculates student retention risk scores and categorizes risk levels (STREAM-011)", () => {
    const predictor = new StudentRetentionPredictor();

    const highRisk = predictor.predictRetentionRisk({
      studentId: "s1",
      studentName: "Student High",
      campusId: "c1",
      absenteeismRatePct: 30,
      gradeDropPct: 25,
      feeDelayDays: 60,
    });

    expect(highRisk.atRiskScore).toBeGreaterThanOrEqual(0.7);
    expect(highRisk.riskCategory).toBe("HIGH");
    expect(highRisk.contributingFactors.length).toBeGreaterThan(0);

    const lowRisk = predictor.predictRetentionRisk({
      studentId: "s2",
      studentName: "Student Low",
      campusId: "c1",
      absenteeismRatePct: 2,
      gradeDropPct: 0,
      feeDelayDays: 0,
    });

    expect(lowRisk.atRiskScore).toBeLessThan(0.3);
    expect(lowRisk.riskCategory).toBe("LOW");
  });

  it("forecasts multi-campus enrollment and identifies capacity bottlenecks (STREAM-012)", () => {
    const forecaster = new EnrollmentForecastingEngine();

    const forecast = forecaster.forecastCampus({
      campusId: "inst-north",
      campusName: "North Campus",
      capacityLimit: 500,
      currentEnrollment: 470,
      historicalEnrollments: [
        { year: "2024", count: 400 },
        { year: "2025", count: 440 },
        { year: "2026", count: 470 },
      ],
    });

    expect(forecast.projectedEnrollmentNextYear).toBeGreaterThan(470);
    expect(forecast.utilizationPercentage).toBeGreaterThan(90);
    expect(forecast.isBottleneckRisk).toBe(true);
  });

  it("executes budget scenario simulations under 100ms SLA (STREAM-013)", () => {
    const simulator = new BudgetScenarioSimulator();

    const result = simulator.simulateScenario({
      scenarioName: "Faculty Salary Increase & Tuition Shift",
      staffCostDelta: 50000,
      tuitionFeeDelta: 200,
      facilityBudgetDelta: 10000,
    });

    expect(result.executionTimeMs).toBeLessThan(100);
    expect(result.simulatedOperatingMargin).toBeDefined();
    expect(result.campusBreakdowns.length).toBe(4);
  });
});
