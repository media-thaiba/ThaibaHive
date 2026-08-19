import {
  copilotQuerySchema,
  copilotFeedbackSchema,
  agentConfigSchema,
  timeSeriesQuerySchema,
} from "@/lib/validation/schemas";
import { hasPermission } from "@thaiba/auth/roles";

describe("Sprint-011 Copilot Validation & RBAC Permissions", () => {
  describe("Zod Validation Schemas", () => {
    it("parses valid copilot queries", () => {
      const parsed = copilotQuerySchema.parse({
        agentType: "academic_advisor",
        campusId: "inst_101",
        query: "What interventions are needed for math scores?",
        contextParams: { grade: "10" },
      });
      expect(parsed.agentType).toBe("academic_advisor");
      expect(parsed.query).toBe("What interventions are needed for math scores?");
    });

    it("parses copilot feedback schema", () => {
      const parsed = copilotFeedbackSchema.parse({
        recommendationId: "rec_100",
        approvalStatus: "APPROVED",
        feedbackNotes: "Proceed with intervention",
      });
      expect(parsed.approvalStatus).toBe("APPROVED");
    });

    it("parses agent config schema", () => {
      const parsed = agentConfigSchema.parse({
        agentType: "financial_controller",
        name: "Financial Controller AI",
        isActive: true,
      });
      expect(parsed.agentType).toBe("financial_controller");
    });

    it("parses time-series query schema", () => {
      const parsed = timeSeriesQuerySchema.parse({
        campusId: "inst_101",
        granularity: "monthly",
      });
      expect(parsed.granularity).toBe("monthly");
    });
  });

  describe("RBAC Permissions Enforcement", () => {
    it("grants full copilot permissions to super_admin and admin", () => {
      expect(hasPermission("super_admin", "copilot:view")).toBe(true);
      expect(hasPermission("super_admin", "agent:manage")).toBe(true);

      expect(hasPermission("admin", "copilot:view")).toBe(true);
      expect(hasPermission("admin", "copilot:interact")).toBe(true);
      expect(hasPermission("admin", "agent:manage")).toBe(true);
      expect(hasPermission("admin", "analytics:timeseries")).toBe(true);
    });

    it("grants copilot permissions to principal", () => {
      expect(hasPermission("principal", "copilot:view")).toBe(true);
      expect(hasPermission("principal", "copilot:interact")).toBe(true);
      expect(hasPermission("principal", "agent:manage")).toBe(true);
      expect(hasPermission("principal", "analytics:timeseries")).toBe(true);
    });

    it("grants scoped copilot view & interact permissions to HOD", () => {
      expect(hasPermission("hod", "copilot:view")).toBe(true);
      expect(hasPermission("hod", "copilot:interact")).toBe(true);
      expect(hasPermission("hod", "agent:manage")).toBe(false);
    });

    it("restricts copilot write & manage permissions for base staff", () => {
      expect(hasPermission("staff", "copilot:view")).toBe(false);
      expect(hasPermission("staff", "agent:manage")).toBe(false);
    });
  });
});
