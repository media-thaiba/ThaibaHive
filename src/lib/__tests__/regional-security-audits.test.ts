
import { RegionalHierarchyService } from "@/lib/regional/regional-hierarchy-service";
import { ensureRegionalTablesExist } from "@/lib/regional/dw-etl-service";
import { db } from "@/db";
import { regionalAccessLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("REG-014: Enterprise Security Hardening & Regional Multi-Tenant Isolation Auditor", () => {
  it("enforces strict multi-tenant boundary isolation and prevents unauthorized group access", async () => {
    await ensureRegionalTablesExist();

    const allowedGroup = await RegionalHierarchyService.createGroup({
      name: "Allowed Group",
      code: `RG_ALLOW_${Date.now()}`,
    });

    const forbiddenGroup = await RegionalHierarchyService.createGroup({
      name: "Forbidden Group",
      code: `RG_FORBID_${Date.now()}`,
    });

    const userId = `usr_test_audit_${Date.now()}`;

    // Grant access ONLY to allowedGroup
    await RegionalHierarchyService.grantAccess({
      userId,
      regionalGroupId: allowedGroup.id,
      role: "regional_admin",
      grantedBy: "usr_super_admin",
    });

    // Check access to allowed group
    const canAccessAllowed = await RegionalHierarchyService.checkUserAccess(userId, allowedGroup.id);
    expect(canAccessAllowed).toBe(true);

    // Check access to forbidden group
    const canAccessForbidden = await RegionalHierarchyService.checkUserAccess(userId, forbiddenGroup.id);
    expect(canAccessForbidden).toBe(false);
  });

  it("enforces time-bound expiration for access delegation", async () => {
    await ensureRegionalTablesExist();

    const group = await RegionalHierarchyService.createGroup({
      name: "Expired Group",
      code: `RG_EXP_${Date.now()}`,
    });

    const userId = `usr_test_expired_${Date.now()}`;
    const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

    await RegionalHierarchyService.grantAccess({
      userId,
      regionalGroupId: group.id,
      role: "regional_auditor",
      grantedBy: "usr_super_admin",
      expiresAt: pastTime,
    });

    const isAccessValid = await RegionalHierarchyService.checkUserAccess(userId, group.id);
    expect(isAccessValid).toBe(false);
  });

  it("audits all regional access grant events in regional_access_logs", async () => {
    await ensureRegionalTablesExist();

    const group = await RegionalHierarchyService.createGroup({
      name: "Log Group",
      code: `RG_LOG_${Date.now()}`,
    });

    const userId = `usr_target_${Date.now()}`;
    const adminId = `usr_admin_${Date.now()}`;

    await RegionalHierarchyService.grantAccess({
      userId,
      regionalGroupId: group.id,
      role: "regional_admin",
      grantedBy: adminId,
    });

    const logs = await db
      .select()
      .from(regionalAccessLogs)
      .where(eq(regionalAccessLogs.regionalGroupId, group.id))
      .all();

    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe("GRANT_ACCESS");
    expect(logs[0].userId).toBe(adminId);
    expect(logs[0].targetEntity).toBe(userId);
  });
});
