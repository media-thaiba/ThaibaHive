import { AutonomousRemediationEngine } from "../autonomous-remediation-engine";

jest.mock("@thaiba/db", () => {
  return {
    db: {
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(null),
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
          innerJoin: jest.fn().mockImplementation(() => ({
            where: jest.fn().mockResolvedValue([
              {
                rule: {
                  id: "rule_01",
                  institutionId: "inst_101",
                  anomalyType: "chronic_absenteeism",
                  workflowId: "wf_01",
                  actionPipelineJson: JSON.stringify([{ type: "auto_ticket" }, { type: "parent_notification" }]),
                },
                workflow: {
                  id: "wf_01",
                  status: "active",
                },
              },
            ]),
          })),
        })),
      })),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(true),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true),
        }),
      }),
    },
    autonomousWorkflows: { id: "wf_01", executionCount: "executionCount" },
    remediationRules: { id: "rule_01", workflowId: "workflowId", institutionId: "institutionId", anomalyType: "anomalyType", isActive: "isActive" },
    remediationTickets: { autoCreated: "autoCreated" },
    remediationActions: {},
    remediationEscalationLogs: {},
  };
});

describe("AutonomousRemediationEngine Service", () => {
  beforeEach(() => {
    AutonomousRemediationEngine.resetEngineState();
  });

  it("evaluates risk alert and triggers remediation workflow pipeline", async () => {
    const alert = {
      institutionId: "inst_101",
      anomalyType: "chronic_absenteeism",
      severity: "critical" as const,
      affectedStudentId: "std_101",
      title: "Critical Absenteeism Spike",
    };

    const results = await AutonomousRemediationEngine.evaluateAndExecute(alert);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("executed");
    expect(results[0].ruleId).toBeDefined();
    expect(results[0].actionResults[0].actionType).toBe("auto_ticket");
  });

  it("deduplicates identical risk alert within 24h window", async () => {
    const alert = {
      institutionId: "inst_101",
      anomalyType: "chronic_absenteeism",
      severity: "critical" as const,
      affectedStudentId: "std_101",
      title: "Critical Absenteeism Spike",
    };

    await AutonomousRemediationEngine.evaluateAndExecute(alert);
    const results = await AutonomousRemediationEngine.evaluateAndExecute(alert);

    expect(results[0].status).toBe("skipped_deduplicated");
  });
});
