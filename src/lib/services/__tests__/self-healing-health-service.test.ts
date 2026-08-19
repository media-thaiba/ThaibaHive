import { SelfHealingHealthService } from "../self-healing-health-service";

jest.mock("@thaiba/db", () => {
  return {
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ total: 15, autoCreated: 14 }]),
        }),
      }),
    },
    remediationTickets: { autoCreated: "autoCreated", institutionId: "institutionId" },
    autonomousWorkflows: { institutionId: "institutionId", status: "status" },
  };
});

describe("SelfHealingHealthService", () => {
  it("calculates platform self-healing health metrics", async () => {
    const health = await SelfHealingHealthService.getSystemHealth("inst_101");

    expect(health.circuitBreakerStatus).toBe("HEALTHY");
    expect(health.autoRemediatedPercentage).toBeGreaterThanOrEqual(0);
    expect(health.manualHoursSaved).toBeGreaterThanOrEqual(0);
  });
});
