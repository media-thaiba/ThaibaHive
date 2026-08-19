import { AuditAnomalyDetector } from "../anomaly-detector";

jest.mock("../violation-dispatcher", () => ({
  violationDispatcher: {
    dispatch: jest.fn().mockResolvedValue({}),
  },
}));

describe("AuditAnomalyDetector", () => {
  let detector: AuditAnomalyDetector;

  beforeEach(() => {
    detector = new AuditAnomalyDetector();
    detector.resetHistory();
  });

  it("detects unauthorized privilege escalation attempts", () => {
    const event = {
      tenantId: "tenant-1",
      actorId: "staff-attacker",
      action: "staff:update",
      entityType: "staff",
      entityId: "staff-victim",
      payload: { data: { role: "super_admin" } },
      timestamp: new Date().toISOString(),
    };

    const violations = detector.evaluate(event);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].ruleId).toBe("UNAUTHORIZED_PRIVILEGE_ESCALATION");
    expect(violations[0].severity).toBe("CRITICAL");
  });

  it("detects bulk data export spikes when rate exceeds threshold", () => {
    const actorId = "suspicious-actor";

    // Trigger 6 rapid export events
    let violations: any[] = [];
    for (let i = 0; i < 6; i++) {
      violations = detector.evaluate({
        tenantId: "tenant-1",
        actorId,
        action: "warehouse:export",
        entityType: "report",
        payload: { data: { count: 100 } },
        timestamp: new Date().toISOString(),
      });
    }

    expect(violations.some((v) => v.ruleId === "BULK_DATA_EXPORT_SPIKE")).toBe(true);
  });

  it("detects financial threshold bypass when dual-authorization is absent", () => {
    const event = {
      tenantId: "tenant-1",
      actorId: "finance-officer",
      action: "finance:payment_create",
      entityType: "payment",
      payload: { data: { amount: 75000 } }, // Over $50k threshold with no secondary approver
      timestamp: new Date().toISOString(),
    };

    const violations = detector.evaluate(event);
    expect(violations.some((v) => v.ruleId === "FINANCIAL_THRESHOLD_BYPASS")).toBe(true);
  });

  it("detects cross-tenant boundary access anomalies", () => {
    const event = {
      tenantId: "tenant-campus-a",
      actorId: "user-1",
      action: "students:read",
      entityType: "student",
      payload: { data: { institutionId: "tenant-campus-b" } },
      timestamp: new Date().toISOString(),
    };

    const violations = detector.evaluate(event);
    expect(violations.some((v) => v.ruleId === "CROSS_TENANT_QUERY_ANOMALY")).toBe(true);
  });
});
