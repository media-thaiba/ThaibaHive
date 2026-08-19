import { FinancialControllerAgent, CampusFinancialLedgerSummary } from "../financial-controller-agent";

describe("Sprint-011 Financial Controller Copilot Agent", () => {
  let agent: FinancialControllerAgent;

  beforeEach(() => {
    agent = new FinancialControllerAgent();
  });

  it("generates budget reallocation plan for moderate deficit", async () => {
    const summary: CampusFinancialLedgerSummary = {
      campusId: "inst_101",
      campusName: "Main Campus",
      targetBudget: 1000000,
      currentRealization: 920000,
      unspentDepartmentalFunds: [{ departmentName: "Library", amount: 45000 }],
      projectedDeficitPercent: 8.0,
    };

    const rec = await agent.analyzeAndRecommend("inst_101", summary);

    expect(rec.domain).toBe("finance");
    expect(rec.title).toContain("Financial Optimization Plan");
    expect(rec.summary).toContain("Library");
    expect(rec.confidenceScore).toBe(0.89);
    expect(rec.humanApprovalStatus).toBe("AUTO_EXECUTE");
  });

  it("flags critical deficit (>15%) for human administrative review", async () => {
    const summary: CampusFinancialLedgerSummary = {
      campusId: "inst_102",
      campusName: "North Campus",
      targetBudget: 1000000,
      currentRealization: 750000,
      unspentDepartmentalFunds: [],
      projectedDeficitPercent: 25.0,
    };

    const rec = await agent.analyzeAndRecommend("inst_102", summary);

    expect(rec.confidenceScore).toBe(0.82);
    expect(rec.humanApprovalStatus).toBe("REQUIRES_HUMAN_APPROVAL");
  });
});
