

import { TriggerEvaluationEngine } from "../triggers/trigger-evaluation-engine";
import { AutomatedNotificationRouter } from "../notifications/automated-notification-router";
import { SMSGatewayAdapter } from "../notifications/sms-gateway-adapter";
import { RemediationTriggerBridge } from "../triggers/remediation-trigger-bridge";

describe("Phase 2 Integration: Automated Notification & Trigger Engine (STREAM-006..010)", () => {
  let engine: TriggerEvaluationEngine;
  let smsGateway: SMSGatewayAdapter;
  let router: AutomatedNotificationRouter;
  let bridge: RemediationTriggerBridge;

  beforeEach(() => {
    engine = new TriggerEvaluationEngine();
    smsGateway = new SMSGatewayAdapter();
    router = new AutomatedNotificationRouter(smsGateway);
    bridge = new RemediationTriggerBridge();
  });

  it("evaluates rules against event payload correctly (STREAM-006)", () => {
    engine.registerRule({
      id: "rule_1",
      tenantId: "tenant-main",
      ruleName: "Severe Absenteeism Alert",
      eventType: "absenteeism",
      conditions: [{ field: "consecutiveDaysAbsent", operator: ">", value: 2 }],
      actionChannel: "sms",
      recipientGroup: "parents",
      priority: "urgent",
      isActive: true,
    });

    const results = engine.evaluateEvent("tenant-main", "absenteeism", {
      studentId: "s-100",
      studentName: "John Doe",
      consecutiveDaysAbsent: 3,
    });

    expect(results.length).toBe(1);
    expect(results[0].ruleName).toBe("Severe Absenteeism Alert");
    expect(results[0].actionChannel).toBe("sms");
  });

  it("dispatches notifications and enforces rate limiting (STREAM-007)", async () => {
    const triggerResult = {
      ruleId: "rule_1",
      ruleName: "Test Rule",
      eventType: "absenteeism",
      matched: true,
      actionChannel: "sms" as const,
      recipientGroup: "parents" as const,
      priority: "high" as const,
      payload: { studentId: "std_404", recipientPhone: "+15551234567" },
      evaluatedAt: new Date().toISOString(),
    };

    // First 3 dispatches succeed
    const d1 = await router.dispatchNotification("tenant-main", triggerResult);
    const d2 = await router.dispatchNotification("tenant-main", triggerResult);
    const d3 = await router.dispatchNotification("tenant-main", triggerResult);

    expect(d1.dispatchStatus).toBe("DELIVERED");
    expect(d2.dispatchStatus).toBe("DELIVERED");
    expect(d3.dispatchStatus).toBe("DELIVERED");

    // 4th dispatch is rate limited (max 3/day)
    const d4 = await router.dispatchNotification("tenant-main", triggerResult);
    expect(d4.dispatchStatus).toBe("RATE_LIMITED");
  });

  it("bridges anomaly detection directly to notification dispatch (STREAM-009)", async () => {
    const result = await bridge.processAnomalyAndDispatch("tenant-main", {
      type: "absenteeism",
      studentId: "std_999",
      studentName: "Jane Smith",
      consecutiveDaysAbsent: 4,
      parentPhone: "+15559876543",
    });

    expect(result.evaluated).toBe(true);
    expect(result.dispatched).toBe(true);
    expect(result.actionChannel).toBe("sms");
  });
});
