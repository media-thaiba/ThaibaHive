
import { RegionalHierarchyService } from "../regional-hierarchy-service";
import { db } from "@/db";
import { regionalAccessLogs,  } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("REG-004: Multi-Tenant Campus Hierarchy & Regional Access Grant Engine", () => {
  it("creates regional group, assigns campus cluster, and grants time-bound access", async () => {
    const groupCode = `RG_HIER_${Date.now()}`;
    const group = await RegionalHierarchyService.createGroup({
      name: "Northern Academic District",
      code: groupCode,
      description: "District covering 15 northern campuses",
    });

    expect(group.id).toBeDefined();
    expect(group.code).toBe(groupCode);

    // Assign campus cluster
    const cluster = await RegionalHierarchyService.assignCampusToCluster({
      regionalGroupId: group.id,
      institutionId: "inst_default",
      clusterCategory: "tier_1",
    });

    expect(cluster.regionalGroupId).toBe(group.id);
    expect(cluster.clusterCategory).toBe("tier_1");

    // Grant access
    const grant = await RegionalHierarchyService.grantAccess({
      userId: "usr_reg_admin_01",
      regionalGroupId: group.id,
      role: "regional_admin",
      grantedBy: "usr_super_admin",
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours in future
    });

    expect(grant.role).toBe("regional_admin");

    // Verify access check
    const hasAccess = await RegionalHierarchyService.checkUserAccess("usr_reg_admin_01", group.id);
    expect(hasAccess).toBe(true);

    const noAccess = await RegionalHierarchyService.checkUserAccess("usr_unauthorized", group.id);
    expect(noAccess).toBe(false);

    // Verify audit log entry written
    const logs = await db
      .select()
      .from(regionalAccessLogs)
      .where(eq(regionalAccessLogs.regionalGroupId, group.id))
      .all();

    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].action).toBe("GRANT_ACCESS");
  });
});
