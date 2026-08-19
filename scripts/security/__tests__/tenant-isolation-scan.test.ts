/**
 * Tenant Isolation & Security Scanner Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantGuard } from "../../../src/lib/security/tenant-guard";
import { TenantIsolationError } from "../../../packages/db";

describe("TenantGuard & Isolation Scanner", () => {
  it("should allow super_admin cross-tenant access", () => {
    expect(() => {
      TenantGuard.validateScope(
        { isSuperAdmin: true, role: "super_admin" },
        "inst-999",
        "adminAudit"
      );
    }).not.toThrow();
  });

  it("should allow tenant users to access their own institution", () => {
    expect(() => {
      TenantGuard.validateScope(
        { institutionId: "inst-101", role: "hod" },
        "inst-101",
        "getDepartment"
      );
    }).not.toThrow();
  });

  it("should block tenant users from accessing a different institution", () => {
    expect(() => {
      TenantGuard.validateScope(
        { institutionId: "inst-101", role: "hod" },
        "inst-202",
        "getDepartment"
      );
    }).toThrow(TenantIsolationError);
  });

  it("should enforce institutionId filter on queries", () => {
    const filters = { status: "ACTIVE", grade: "10A" };
    const scoped = TenantGuard.enforceFilter(
      { institutionId: "inst-101", role: "staff" },
      filters
    );

    expect(scoped).toEqual({
      status: "ACTIVE",
      grade: "10A",
      institutionId: "inst-101",
    });
  });
});
