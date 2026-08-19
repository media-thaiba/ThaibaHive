import { ViolationDispatcher } from "../violation-dispatcher";
import { complianceMetrics } from "../../observability/compliance-metrics";

// Mock DB
jest.mock("@/db", () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue({}),
    }),
  },
}));

describe("ViolationDispatcher", () => {
  let dispatcher: ViolationDispatcher;

  beforeEach(() => {
    dispatcher = new ViolationDispatcher();
    dispatcher.clearDedup();
    complianceMetrics.reset();
  });

  it("dispatches and records a compliance violation", async () => {
    const event = {
      tenantId: "tenant-alert",
      actorId: "bad-actor",
      action: "role:escalate",
      entityType: "user",
      timestamp: new Date().toISOString(),
    };

    const report = {
      ruleId: "TEST_RULE",
      ruleName: "Test Anomaly Rule",
      severity: "HIGH" as const,
      score: 80,
      details: { foo: "bar" },
    };

    const record = await dispatcher.dispatch(event, report);
    expect(record).not.toBeNull();
    expect(record?.ruleId).toBe("TEST_RULE");
    expect(record?.severity).toBe("HIGH");

    // Deduplication should block identical immediate second dispatch
    const duplicateRecord = await dispatcher.dispatch(event, report);
    expect(duplicateRecord).toBeNull();
  });
});
