import { hasPermission, getRolePermissions } from "../roles";
import type { StaffRole } from "@/types";

describe("Roles and Permissions", () => {
  describe("hasPermission", () => {
    it("should grant super_admin any permission", () => {
      expect(hasPermission("super_admin", "any:random:permission")).toBe(true);
      expect(hasPermission("super_admin", "system:telemetry")).toBe(true);
    });

    it("should correctly evaluate mapped permissions for admin", () => {
      expect(hasPermission("admin", "staff:create")).toBe(true);
      expect(hasPermission("admin", "attendance:manage")).toBe(true);
      expect(hasPermission("admin", "non_existent_permission")).toBe(false);
    });

    it("should correctly evaluate mapped permissions for principal", () => {
      expect(hasPermission("principal", "staff:create")).toBe(true);
      expect(hasPermission("principal", "finance:create")).toBe(true);
      expect(hasPermission("principal", "system:telemetry")).toBe(false);
    });

    it("should correctly evaluate mapped permissions for hod", () => {
      expect(hasPermission("hod", "leaves:approve")).toBe(true);
      expect(hasPermission("hod", "staff:read")).toBe(true);
      expect(hasPermission("hod", "staff:create")).toBe(false);
    });

    it("should correctly evaluate mapped permissions for staff", () => {
      expect(hasPermission("staff", "announcements:read")).toBe(true);
      expect(hasPermission("staff", "grievances:create")).toBe(true);
      expect(hasPermission("staff", "staff:create")).toBe(false);
      expect(hasPermission("staff", "leaves:approve")).toBe(false);
    });
  });

  describe("getRolePermissions", () => {
    it("should return the permission array for valid roles", () => {
      const adminPerms = getRolePermissions("admin");
      expect(adminPerms).toContain("staff:read");
      expect(adminPerms).toContain("attendance:manage");
    });

    it("should return empty array or correct fallback for invalid role", () => {
      const invalidPerms = getRolePermissions("invalid_role" as StaffRole);
      expect(invalidPerms).toEqual([]);
    });
  });
});
