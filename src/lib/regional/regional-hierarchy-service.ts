import { db } from "@/db";
import {
  regionalGroups,
  institutionClusters,
  regionalAccessGrants,
  regionalAccessLogs,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureRegionalTablesExist } from "./dw-etl-service";

export interface CreateRegionalGroupInput {
  name: string;
  code: string;
  description?: string;
  regionalDirectorId?: string;
}

export interface AssignClusterInput {
  regionalGroupId: string;
  institutionId: string;
  clusterCategory?: "standard" | "tier_1" | "tier_2" | "rural" | "urban";
}

export interface GrantAccessInput {
  userId: string;
  regionalGroupId: string;
  role: "regional_admin" | "regional_auditor";
  grantedBy: string;
  expiresAt?: string;
}

export class RegionalHierarchyService {
  /**
   * Create a new regional group cluster container.
   */
  static async createGroup(input: CreateRegionalGroupInput) {
    await ensureRegionalTablesExist();

    const id = `rg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record = {
      id,
      name: input.name,
      code: input.code,
      description: input.description || null,
      regionalDirectorId: input.regionalDirectorId || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(regionalGroups).values(record).run();
    return record;
  }

  /**
   * Assign an institution to a regional group cluster.
   */
  static async assignCampusToCluster(input: AssignClusterInput) {
    await ensureRegionalTablesExist();

    const id = `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      regionalGroupId: input.regionalGroupId,
      institutionId: input.institutionId,
      clusterCategory: input.clusterCategory || "standard",
      assignedAt: new Date().toISOString(),
    };

    await db.insert(institutionClusters).values(record).run();
    return record;
  }

  /**
   * Grant time-bound access delegation for regional admin or auditor.
   */
  static async grantAccess(input: GrantAccessInput) {
    await ensureRegionalTablesExist();

    const id = `grant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id,
      userId: input.userId,
      regionalGroupId: input.regionalGroupId,
      role: input.role,
      grantedBy: input.grantedBy,
      expiresAt: input.expiresAt || null,
      createdAt: new Date().toISOString(),
    };

    await db.insert(regionalAccessGrants).values(record).run();

    // Write audit log
    await db.insert(regionalAccessLogs).values({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: input.grantedBy,
      regionalGroupId: input.regionalGroupId,
      action: "GRANT_ACCESS",
      targetEntity: input.userId,
      details: JSON.stringify({ role: input.role, expiresAt: input.expiresAt }),
      createdAt: new Date().toISOString(),
    }).run();

    return record;
  }

  /**
   * Verify if a user has active regional access for a specified regional group.
   */
  static async checkUserAccess(userId: string, regionalGroupId: string, isSuperAdmin: boolean = false): Promise<boolean> {
    await ensureRegionalTablesExist();

    if (isSuperAdmin) return true;

    const now = new Date().toISOString();
    const grants = await db
      .select()
      .from(regionalAccessGrants)
      .where(
        and(
          eq(regionalAccessGrants.userId, userId),
          eq(regionalAccessGrants.regionalGroupId, regionalGroupId)
        )
      )
      .all();

    const validGrant = grants.find((g) => !g.expiresAt || g.expiresAt > now);
    return !!validGrant;
  }

  /**
   * List all regional groups.
   */
  static async listGroups() {
    await ensureRegionalTablesExist();
    return db.select().from(regionalGroups).all();
  }
}
