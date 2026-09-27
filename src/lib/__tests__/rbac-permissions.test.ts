import { hasPermission, getRolePermissions, VALID_STAFF_ROLES } from "../../../packages/auth/roles";

describe("RBAC Permission Matrix Full Audit", () => {
  it("should have all defined staff roles in VALID_STAFF_ROLES", () => {
    expect(VALID_STAFF_ROLES).toContain("super_admin");
    expect(VALID_STAFF_ROLES).toContain("admin");
    expect(VALID_STAFF_ROLES).toContain("principal");
    expect(VALID_STAFF_ROLES).toContain("hod");
    expect(VALID_STAFF_ROLES).toContain("staff");
    expect(VALID_STAFF_ROLES).toContain("accounts");
    expect(VALID_STAFF_ROLES).toContain("purchase");
    expect(VALID_STAFF_ROLES).toContain("regional_admin");
    expect(VALID_STAFF_ROLES).toContain("regional_auditor");
    expect(VALID_STAFF_ROLES).toContain("coordinator");
    expect(VALID_STAFF_ROLES).toContain("institutional_head");
    expect(VALID_STAFF_ROLES).toContain("academic_coordinator");
    expect(VALID_STAFF_ROLES).toContain("exam_coordinator");
    expect(VALID_STAFF_ROLES).toContain("teacher");
    expect(VALID_STAFF_ROLES).toContain("inspector");
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
    expect(hasPermission("admin", "unmapped:random:permission")).toBe(false);
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

  it("getRolePermissions should return array of string permissions", () => {
    const perms = getRolePermissions("admin");
    expect(Array.isArray(perms)).toBe(true);
    expect(perms.length).toBeGreaterThan(10);
  });
});
