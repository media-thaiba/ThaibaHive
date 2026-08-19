
import {
  regionalGroupCreateSchema,
  regionalClusterAssignSchema,
  regionalAccessGrantSchema,
  regionalBenchmarkQuerySchema,
  pushAlertDispatchSchema,
} from "../validation/schemas";
import { hasPermission, isValidRole } from "@thaiba/auth/roles";

describe("REG-002: Regional Validation & RBAC Permission Matrix", () => {
  it("validates regional group creation payload", () => {
    const valid = regionalGroupCreateSchema.safeParse({
      name: "Southern Education Zone",
      code: "REG-SOUTH-01",
      description: "Regional cluster of 25 campuses",
    });
    expect(valid.success).toBe(true);

    const invalid = regionalGroupCreateSchema.safeParse({
      name: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates institution cluster assignment payload", () => {
    const valid = regionalClusterAssignSchema.safeParse({
      regionalGroupId: "rg_south",
      institutionId: "inst_101",
      clusterCategory: "tier_1",
    });
    expect(valid.success).toBe(true);
  });

  it("validates regional access grant payload", () => {
    const valid = regionalAccessGrantSchema.safeParse({
      userId: "usr_reg_01",
      regionalGroupId: "rg_south",
      role: "regional_admin",
    });
    expect(valid.success).toBe(true);
  });

  it("validates benchmarking query payload", () => {
    const valid = regionalBenchmarkQuerySchema.safeParse({
      regionalGroupId: "rg_south",
      period: "30d",
      metricDomain: "attendance",
    });
    expect(valid.success).toBe(true);
  });

  it("validates push alert dispatch payload", () => {
    const valid = pushAlertDispatchSchema.safeParse({
      alertId: "anom_101",
      severity: "critical",
      title: "Absenteeism Alert",
      body: "High unexcused absences detected in Grade 10.",
      targetRegionalGroupId: "rg_south",
    });
    expect(valid.success).toBe(true);
  });

  it("verifies RBAC permissions for regional roles", () => {
    expect(isValidRole("regional_admin")).toBe(true);
    expect(isValidRole("regional_auditor")).toBe(true);

    expect(hasPermission("regional_admin", "regional:view")).toBe(true);
    expect(hasPermission("regional_admin", "regional:manage")).toBe(true);
    expect(hasPermission("regional_admin", "warehouse:export")).toBe(true);
    expect(hasPermission("regional_admin", "alerts:push_configure")).toBe(true);

    expect(hasPermission("regional_auditor", "regional:view")).toBe(true);
    expect(hasPermission("regional_auditor", "regional:manage")).toBe(false);
    expect(hasPermission("regional_auditor", "warehouse:export")).toBe(true);
  });
});
