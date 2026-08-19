

import {
  realtimeStreamQuerySchema,
  triggerRuleSchema,
  retentionPredictionQuerySchema,
  budgetSimulationSchema,
} from "../validation/schemas";
import { hasPermission } from "../../../packages/auth/roles";

describe("Sprint-012 Validation Schemas & RBAC Permissions", () => {
  describe("realtimeStreamQuerySchema", () => {
    it("should parse valid realtime stream query options", () => {
      const result = realtimeStreamQuerySchema.safeParse({
        channels: ["copilot_feed", "risk_alerts"],
        connectionType: "sse",
        lastEventId: "evt-12345",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.connectionType).toBe("sse");
        expect(result.data.channels).toContain("copilot_feed");
      }
    });

    it("should apply default websocket connection type", () => {
      const result = realtimeStreamQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.connectionType).toBe("websocket");
      }
    });
  });

  describe("triggerRuleSchema", () => {
    it("should parse valid trigger rule payload", () => {
      const result = triggerRuleSchema.safeParse({
        ruleName: "Chronic Absenteeism Parent Alert",
        eventType: "absenteeism",
        conditions: { consecutiveDays: 3, status: "unexcused" },
        actionChannel: "sms",
        recipientGroup: "parents",
        priority: "high",
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing ruleName", () => {
      const result = triggerRuleSchema.safeParse({
        eventType: "absenteeism",
        conditions: {},
        actionChannel: "sms",
        recipientGroup: "parents",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("retentionPredictionQuerySchema", () => {
    it("should parse valid retention query parameters", () => {
      const result = retentionPredictionQuerySchema.safeParse({
        campusId: "inst-001",
        riskThreshold: "0.75",
        limit: "100",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.riskThreshold).toBe(0.75);
        expect(result.data.limit).toBe(100);
      }
    });
  });

  describe("budgetSimulationSchema", () => {
    it("should parse valid budget scenario parameters", () => {
      const result = budgetSimulationSchema.safeParse({
        scenarioName: "2026 Q4 Reallocation Strategy",
        campusIds: ["inst-1", "inst-2"],
        staffCostDelta: 50000,
        tuitionFeeDelta: -10000,
        facilityBudgetDelta: 20000,
        scholarshipAllocationDelta: 15000,
      });
      expect(result.success).toBe(true);
    });

    it("should apply defaults for deltas if omitted", () => {
      const result = budgetSimulationSchema.safeParse({
        scenarioName: "Baseline Scenario",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.staffCostDelta).toBe(0);
        expect(result.data.tuitionFeeDelta).toBe(0);
      }
    });
  });

  describe("RBAC Permissions Verification", () => {
    it("should grant super_admin all permissions", () => {
      expect(hasPermission("super_admin", "realtime:stream")).toBe(true);
      expect(hasPermission("super_admin", "triggers:manage")).toBe(true);
      expect(hasPermission("super_admin", "predictive:retention")).toBe(true);
      expect(hasPermission("super_admin", "simulation:budget")).toBe(true);
    });

    it("should grant admin and principal sprint permissions", () => {
      expect(hasPermission("admin", "realtime:stream")).toBe(true);
      expect(hasPermission("admin", "triggers:manage")).toBe(true);
      expect(hasPermission("admin", "predictive:retention")).toBe(true);
      expect(hasPermission("admin", "simulation:budget")).toBe(true);

      expect(hasPermission("principal", "realtime:stream")).toBe(true);
      expect(hasPermission("principal", "triggers:manage")).toBe(true);
    });

    it("should deny staff administrative simulation permissions", () => {
      expect(hasPermission("staff", "triggers:manage")).toBe(false);
      expect(hasPermission("staff", "simulation:budget")).toBe(false);
    });
  });
});
