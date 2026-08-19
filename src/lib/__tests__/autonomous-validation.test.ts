import {
  autonomousWorkflowSchema,
  remediationTicketSchema,
  financialForecastQuerySchema,
  complianceReportSchema,
} from "../validation/schemas";
import { hasPermission } from "../../../packages/auth/roles";

describe("Autonomous Operations Validation & RBAC", () => {
  it("validates autonomousWorkflowSchema payload", () => {
    const valid = autonomousWorkflowSchema.safeParse({
      name: "Auto-Reassign High Absenteeism Staff",
      triggerType: "anomaly_detected",
      status: "active",
    });
    expect(valid.success).toBe(true);
  });

  it("validates remediationTicketSchema payload", () => {
    const valid = remediationTicketSchema.safeParse({
      title: "Fee collection velocity below threshold",
      severity: "high",
      category: "finance",
    });
    expect(valid.success).toBe(true);
  });

  it("validates financialForecastQuerySchema payload", () => {
    const valid = financialForecastQuerySchema.safeParse({
      horizonDays: 90,
      campusId: "campus_1",
    });
    expect(valid.success).toBe(true);
  });

  it("validates complianceReportSchema payload", () => {
    const valid = complianceReportSchema.safeParse({
      frameworkCode: "regional_privacy_v1",
      institutionId: "inst_101",
    });
    expect(valid.success).toBe(true);
  });

  it("checks RBAC permissions for autonomy modules", () => {
    expect(hasPermission("super_admin", "autonomy:manage")).toBe(true);
    expect(hasPermission("admin", "autonomy:manage")).toBe(true);
    expect(hasPermission("staff", "autonomy:manage")).toBe(false);
    expect(hasPermission("principal", "compliance:audit")).toBe(true);
    expect(hasPermission("admin", "financial:forecast")).toBe(true);
  });
});
