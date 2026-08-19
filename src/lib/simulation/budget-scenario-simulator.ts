export interface BudgetSimulationInput {
  scenarioName: string;
  campusIds?: string[];
  staffCostDelta?: number; // e.g. +50000
  tuitionFeeDelta?: number; // e.g. -500
  facilityBudgetDelta?: number; // e.g. +20000
  scholarshipAllocationDelta?: number; // e.g. +15000
}

export interface CampusBudgetBreakdown {
  campusId: string;
  campusName: string;
  baselineRevenue: number;
  baselineExpenses: number;
  simulatedRevenue: number;
  simulatedExpenses: number;
  simulatedMargin: number;
  variancePercentage: number;
}

export interface SimulationResult {
  scenarioName: string;
  executionTimeMs: number;
  baselineTotalRevenue: number;
  baselineTotalExpenses: number;
  baselineOperatingMargin: number;
  simulatedTotalRevenue: number;
  simulatedTotalExpenses: number;
  simulatedOperatingMargin: number;
  varianceAmount: number;
  variancePercentage: number;
  campusBreakdowns: CampusBudgetBreakdown[];
  simulatedAt: string;
}

export class BudgetScenarioSimulator {
  simulateScenario(input: BudgetSimulationInput): SimulationResult {
    const startTime = performance.now();

    const staffCostDelta = input.staffCostDelta || 0;
    const tuitionFeeDelta = input.tuitionFeeDelta || 0;
    const facilityBudgetDelta = input.facilityBudgetDelta || 0;
    const scholarshipAllocationDelta = input.scholarshipAllocationDelta || 0;

    const sampleCampuses = [
      { id: "inst-001", name: "Main Campus", baseRev: 1200000, baseExp: 900000, students: 800 },
      { id: "inst-002", name: "North Wing", baseRev: 850000, baseExp: 650000, students: 500 },
      { id: "inst-003", name: "South Campus", baseRev: 950000, baseExp: 720000, students: 600 },
      { id: "inst-004", name: "City Academy", baseRev: 1100000, baseExp: 820000, students: 750 },
    ];

    const targetCampuses = input.campusIds && input.campusIds.length > 0
      ? sampleCampuses.filter((c) => input.campusIds!.includes(c.id))
      : sampleCampuses;

    let baselineTotalRevenue = 0;
    let baselineTotalExpenses = 0;
    let simulatedTotalRevenue = 0;
    let simulatedTotalExpenses = 0;

    const campusBreakdowns: CampusBudgetBreakdown[] = targetCampuses.map((c) => {
      baselineTotalRevenue += c.baseRev;
      baselineTotalExpenses += c.baseExp;

      const simRev = c.baseRev + tuitionFeeDelta * c.students;
      const simExp = c.baseExp + staffCostDelta + facilityBudgetDelta + scholarshipAllocationDelta;

      simulatedTotalRevenue += simRev;
      simulatedTotalExpenses += simExp;

      const simMargin = simRev - simExp;
      const baseMargin = c.baseRev - c.baseExp;
      const varPct = baseMargin > 0 ? Number((((simMargin - baseMargin) / baseMargin) * 100).toFixed(2)) : 0;

      return {
        campusId: c.id,
        campusName: c.name,
        baselineRevenue: c.baseRev,
        baselineExpenses: c.baseExp,
        simulatedRevenue: simRev,
        simulatedExpenses: simExp,
        simulatedMargin: simMargin,
        variancePercentage: varPct,
      };
    });

    const baselineOperatingMargin = baselineTotalRevenue - baselineTotalExpenses;
    const simulatedOperatingMargin = simulatedTotalRevenue - simulatedTotalExpenses;
    const varianceAmount = simulatedOperatingMargin - baselineOperatingMargin;
    const variancePercentage =
      baselineOperatingMargin > 0
        ? Number(((varianceAmount / baselineOperatingMargin) * 100).toFixed(2))
        : 0;

    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    return {
      scenarioName: input.scenarioName,
      executionTimeMs,
      baselineTotalRevenue,
      baselineTotalExpenses,
      baselineOperatingMargin,
      simulatedTotalRevenue,
      simulatedTotalExpenses,
      simulatedOperatingMargin,
      varianceAmount,
      variancePercentage,
      campusBreakdowns,
      simulatedAt: new Date().toISOString(),
    };
  }
}

export const defaultBudgetSimulator = new BudgetScenarioSimulator();
