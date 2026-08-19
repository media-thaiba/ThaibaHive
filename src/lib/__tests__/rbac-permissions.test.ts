import { hasPermission, getRolePermissions, VALID_STAFF_ROLES } from "../../../packages/auth/roles";

describe("RBAC Permission Matrix Full Audit", () => {
  it("should have all defined staff roles in VALID_STAFF_ROLES", () => {
    expect(VALID_STAFF_ROLES).toEqual([
      "super_admin",
      "admin",
      "principal",
      "hod",
      "staff",
      "accounts",
      "purchase",
      "regional_admin",
      "regional_auditor",
    ]);
  });

  it("super_admin should have wildcard permission access to all scopes", () => {
    const scopes = ["staff:delete", "finance:export", "org:manage", "random:scope"];
    for (const scope of scopes) {
      expect(hasPermission("super_admin", scope)).toBe(true);
    }
  });

  it("admin role permissions check", () => {
    expect(hasPermission("admin", "staff:create")).toBe(true);
    expect(hasPermission("admin", "org:manage")).toBe(true);
    expect(hasPermission("admin", "students:delete")).toBe(false); // Only principal / super_admin
  });

  it("principal role permissions check", () => {
    expect(hasPermission("principal", "students:create")).toBe(true);
    expect(hasPermission("principal", "classes:create")).toBe(true);
    expect(hasPermission("principal", "system:telemetry")).toBe(false);
  });

  it("hod role permissions check", () => {
    expect(hasPermission("hod", "leaves:approve")).toBe(true);
    expect(hasPermission("hod", "staff:read")).toBe(true);
    expect(hasPermission("hod", "staff:create")).toBe(false);
  });

  it("staff role permissions check", () => {
    expect(hasPermission("staff", "announcements:read")).toBe(true);
    expect(hasPermission("staff", "grievances:create")).toBe(true);
    expect(hasPermission("staff", "leaves:approve")).toBe(false);
    expect(hasPermission("staff", "staff:create")).toBe(false);
  });

  it("accounts role permissions check", () => {
    expect(hasPermission("accounts", "finance:export")).toBe(true);
    expect(hasPermission("accounts", "finance:create")).toBe(true);
    expect(hasPermission("accounts", "staff:create")).toBe(false);
  });

  it("purchase role permissions check", () => {
    expect(hasPermission("purchase", "assets:create")).toBe(true);
    expect(hasPermission("purchase", "assets:delete")).toBe(true);
    expect(hasPermission("purchase", "leaves:approve")).toBe(false);
  });

  it("getRolePermissions returns non-empty array for all valid roles", () => {
    for (const role of VALID_STAFF_ROLES) {
      if (role === "super_admin") continue; // super_admin uses ["*"]
      const perms = getRolePermissions(role);
      expect(perms.length).toBeGreaterThan(0);
    }
  });
});
