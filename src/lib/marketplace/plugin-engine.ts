import { db } from "@/db";
import {
  agentPlugins,
  agentPluginInstallations,
  agentPluginReviews,
} from "@/db/schema";
import { eq, and, or, sql, desc, like } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";
import { getRolePermissions } from "@thaiba/auth";
import { merkleAuditLedger } from "@/lib/agents/guardrails/merkle-ledger";
import type {
  AgentPluginPublishInput,
  AgentPluginManifest,
} from "@/lib/validation/schemas";

export interface PluginActorContext {
  userId?: string;
  role?: string;
  institutionId?: string;
  permissions?: string[];
}

export interface PluginFilter {
  category?: string;
  scope?: string;
  approvalStatus?: string;
  search?: string;
}

export class MarketplaceEngine {
  private static instance: MarketplaceEngine;

  public static getInstance(): MarketplaceEngine {
    if (!MarketplaceEngine.instance) {
      MarketplaceEngine.instance = new MarketplaceEngine();
    }
    return MarketplaceEngine.instance;
  }

  /**
   * Deterministically canonicalizes an object and computes its SHA-256 hash.
   */
  public static computeManifestHash(manifest: any): string {
    const canonicalString = MarketplaceEngine.canonicalize(manifest);
    return createHash("sha256").update(canonicalString).digest("hex");
  }

  private static canonicalize(obj: any): string {
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return `[${obj.map((item) => MarketplaceEngine.canonicalize(item)).join(",")}]`;
    }
    const keys = Object.keys(obj).sort();
    const keyValPairs = keys.map(
      (k) => `${JSON.stringify(k)}:${MarketplaceEngine.canonicalize(obj[k])}`
    );
    return `{${keyValPairs.join(",")}}`;
  }

  /**
   * Publish a new plugin listing in pending_review status.
   */
  public async publishPlugin(
    input: AgentPluginPublishInput,
    actor: PluginActorContext
  ): Promise<any> {
    // 1. Check semver uniqueness
    const existing = await db
      .select()
      .from(agentPlugins)
      .where(
        and(
          eq(agentPlugins.pluginKey, input.pluginKey),
          eq(agentPlugins.version, input.version)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error(
        `Plugin with key '${input.pluginKey}' and version '${input.version}' already exists.`
      );
    }

    // 2. Resolve institutionId and scope
    let institutionId: string | null = null;
    let scope = input.scope || "institution_private";

    if (scope === "global") {
      // Global listings have null institutionId
      institutionId = null;
    } else {
      institutionId = actor.institutionId || null;
    }

    // 3. Compute manifest hash
    const manifestHash = MarketplaceEngine.computeManifestHash(input.manifest);
    const pluginId = randomUUID();
    const now = new Date().toISOString();

    const newPlugin = {
      id: pluginId,
      institutionId,
      scope,
      pluginKey: input.pluginKey,
      displayName: input.displayName,
      summary: input.summary,
      description: input.description || null,
      version: input.version,
      authorStaffId: actor.userId || null,
      authorVerified: actor.role === "super_admin" || actor.role === "system",
      category: input.category,
      capabilitiesJson: JSON.stringify(input.capabilities || []),
      manifestJson: JSON.stringify(input.manifest),
      manifestHash,
      approvalStatus: "pending_review",
      installedCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(agentPlugins).values(newPlugin);

    // 4. Synchronous Merkle Audit Log
    await merkleAuditLedger.enqueueInvocation(
      {
        agentId: actor.userId || "system",
        toolName: "marketplace:publish",
        institutionId: actor.institutionId || "global",
        status: "success",
        durationMs: 0,
        inputHash: createHash("sha256")
          .update(JSON.stringify(input))
          .digest("hex"),
        outputHash: createHash("sha256")
          .update(JSON.stringify({ pluginId, pluginKey: input.pluginKey }))
          .digest("hex"),
      },
      { immediateFlush: true }
    );

    return newPlugin;
  }

  /**
   * Approve or reject a plugin listing.
   * Enforces global-approval rule: scope='global' can only be approved by super_admin or system.
   */
  public async approvePlugin(
    pluginId: string,
    actor: PluginActorContext,
    action: "approve" | "reject",
    reason?: string
  ): Promise<any> {
    const rows = await db
      .select()
      .from(agentPlugins)
      .where(eq(agentPlugins.id, pluginId))
      .limit(1);

    if (rows.length === 0) {
      throw new Error("Plugin not found.");
    }

    const plugin = rows[0];

    // Global Approval Rule: Only super_admin or system machine role can approve global listings
    if (plugin.scope === "global" || plugin.institutionId === null) {
      if (actor.role !== "super_admin" && actor.role !== "system") {
        throw new Error(
          "Forbidden: Global plugins can only be approved by super_admin or system."
        );
      }
    } else {
      // Tenant-scoped plugin approval
      if (actor.role !== "super_admin" && actor.role !== "system") {
        if (
          actor.role !== "admin" ||
          actor.institutionId !== plugin.institutionId
        ) {
          throw new Error(
            "Forbidden: Cannot approve plugins for another institution."
          );
        }
      }
    }

    const newApprovalStatus = action === "approve" ? "approved" : "rejected";
    const now = new Date().toISOString();

    await db
      .update(agentPlugins)
      .set({
        approvalStatus: newApprovalStatus,
        updatedAt: now,
      })
      .where(eq(agentPlugins.id, pluginId));

    // Synchronous Merkle Audit Log
    await merkleAuditLedger.enqueueInvocation(
      {
        agentId: actor.userId || "system",
        toolName:
          action === "approve" ? "marketplace:approve" : "marketplace:reject",
        institutionId: actor.institutionId || "global",
        status: "success",
        durationMs: 0,
        inputHash: createHash("sha256")
          .update(JSON.stringify({ pluginId, action, reason }))
          .digest("hex"),
        outputHash: createHash("sha256")
          .update(
            JSON.stringify({ pluginId, approvalStatus: newApprovalStatus })
          )
          .digest("hex"),
      },
      { immediateFlush: true }
    );

    return {
      ...plugin,
      approvalStatus: newApprovalStatus,
      updatedAt: now,
    };
  }

  /**
   * Update plugin manifest. If manifest hash changes, re-triggers pending_review.
   */
  public async updatePluginManifest(
    pluginId: string,
    newManifest: AgentPluginManifest,
    actor: PluginActorContext
  ): Promise<any> {
    const rows = await db
      .select()
      .from(agentPlugins)
      .where(eq(agentPlugins.id, pluginId))
      .limit(1);

    if (rows.length === 0) {
      throw new Error("Plugin not found.");
    }

    const plugin = rows[0];

    // Authorization check
    const isOwner = actor.userId && plugin.authorStaffId === actor.userId;
    const isTenantAdmin =
      actor.role === "admin" && actor.institutionId === plugin.institutionId;
    const isSuper = actor.role === "super_admin" || actor.role === "system";

    if (!isOwner && !isTenantAdmin && !isSuper) {
      throw new Error("Forbidden: Not authorized to update this plugin.");
    }

    const newHash = MarketplaceEngine.computeManifestHash(newManifest);
    const hashChanged = newHash !== plugin.manifestHash;
    const approvalStatus = hashChanged ? "pending_review" : plugin.approvalStatus;
    const now = new Date().toISOString();

    await db
      .update(agentPlugins)
      .set({
        manifestJson: JSON.stringify(newManifest),
        manifestHash: newHash,
        approvalStatus,
        updatedAt: now,
      })
      .where(eq(agentPlugins.id, pluginId));

    return {
      ...plugin,
      manifestJson: JSON.stringify(newManifest),
      manifestHash: newHash,
      approvalStatus,
      updatedAt: now,
    };
  }

  /**
   * Deprecate a plugin listing.
   */
  public async deprecatePlugin(
    pluginId: string,
    actor: PluginActorContext
  ): Promise<any> {
    const rows = await db
      .select()
      .from(agentPlugins)
      .where(eq(agentPlugins.id, pluginId))
      .limit(1);

    if (rows.length === 0) {
      throw new Error("Plugin not found.");
    }

    const plugin = rows[0];
    const isSuper = actor.role === "super_admin" || actor.role === "system";
    const isTenantAdmin =
      actor.role === "admin" && actor.institutionId === plugin.institutionId;

    if (!isSuper && !isTenantAdmin) {
      throw new Error("Forbidden: Not authorized to deprecate this plugin.");
    }

    const now = new Date().toISOString();

    await db
      .update(agentPlugins)
      .set({
        approvalStatus: "deprecated",
        status: "suspended",
        updatedAt: now,
      })
      .where(eq(agentPlugins.id, pluginId));

    await merkleAuditLedger.enqueueInvocation(
      {
        agentId: actor.userId || "system",
        toolName: "marketplace:deprecate",
        institutionId: actor.institutionId || "global",
        status: "success",
        durationMs: 0,
        inputHash: createHash("sha256")
          .update(JSON.stringify({ pluginId }))
          .digest("hex"),
        outputHash: createHash("sha256")
          .update(JSON.stringify({ pluginId, status: "deprecated" }))
          .digest("hex"),
      },
      { immediateFlush: true }
    );

    return {
      ...plugin,
      approvalStatus: "deprecated",
      status: "suspended",
      updatedAt: now,
    };
  }

  /**
   * List plugins with tenant visibility filtering.
   * Visibility:
   * - super_admin/system: all plugins
   * - standard callers: approved global plugins + own institution plugins + approved shared plugins
   */
  public async listPlugins(
    caller: PluginActorContext,
    filter?: PluginFilter
  ): Promise<any[]> {
    const isSuper = caller.role === "super_admin" || caller.role === "system";
    const conditions = [];

    if (!isSuper) {
      // Visibility constraint
      const visibilityConditions = [
        and(
          eq(agentPlugins.scope, "global"),
          eq(agentPlugins.approvalStatus, "approved")
        ),
        and(
          eq(agentPlugins.scope, "institution_shared"),
          eq(agentPlugins.approvalStatus, "approved")
        ),
      ];

      if (caller.institutionId) {
        visibilityConditions.push(
          eq(agentPlugins.institutionId, caller.institutionId)
        );
      }

      conditions.push(or(...visibilityConditions));
    }

    if (filter?.category) {
      conditions.push(eq(agentPlugins.category, filter.category));
    }
    if (filter?.scope) {
      conditions.push(eq(agentPlugins.scope, filter.scope));
    }
    if (filter?.approvalStatus) {
      conditions.push(eq(agentPlugins.approvalStatus, filter.approvalStatus));
    }
    if (filter?.search) {
      conditions.push(
        or(
          like(agentPlugins.displayName, `%${filter.search}%`),
          like(agentPlugins.summary, `%${filter.search}%`),
          like(agentPlugins.pluginKey, `%${filter.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db
      .select()
      .from(agentPlugins)
      .where(whereClause)
      .orderBy(desc(agentPlugins.createdAt));
  }

  /**
   * Get plugin by ID with tenant visibility check.
   */
  public async getPlugin(
    pluginId: string,
    caller: PluginActorContext
  ): Promise<any | null> {
    const rows = await db
      .select()
      .from(agentPlugins)
      .where(eq(agentPlugins.id, pluginId))
      .limit(1);

    if (rows.length === 0) return null;

    const plugin = rows[0];
    const isSuper = caller.role === "super_admin" || caller.role === "system";

    if (isSuper) return plugin;
    if (caller.institutionId && plugin.institutionId === caller.institutionId) {
      return plugin;
    }
    if (
      (plugin.scope === "global" || plugin.scope === "institution_shared") &&
      plugin.approvalStatus === "approved"
    ) {
      return plugin;
    }

    return null;
  }

  /**
   * Install a plugin for a tenant with escalation-proof capability gating.
   * grantedToolPermissions = manifest.permissions ∩ installerEffectivePermissions
   */
  public async installPlugin(
    pluginId: string,
    installer: {
      userId: string;
      role: string;
      institutionId: string;
      permissions?: string[];
    },
    options?: {
      requestedPermissions?: string[];
      config?: Record<string, any>;
      enabled?: boolean;
    }
  ): Promise<any> {
    if (!installer.institutionId) {
      throw new Error("Institution ID is required for plugin installation.");
    }

    const plugin = await this.getPlugin(pluginId, installer);
    if (!plugin) {
      throw new Error("Plugin not found.");
    }

    if (
      plugin.approvalStatus !== "approved" &&
      plugin.institutionId !== installer.institutionId
    ) {
      throw new Error("Plugin is not approved for installation.");
    }

    const manifest: AgentPluginManifest =
      typeof plugin.manifestJson === "string"
        ? JSON.parse(plugin.manifestJson)
        : plugin.manifestJson;

    const manifestPermissions: string[] = manifest.permissions || [];
    const isSuper =
      installer.role === "super_admin" || installer.role === "system";

    // Installer's effective ACL
    const installerPermissions: string[] =
      installer.permissions || getRolePermissions(installer.role) || [];

    // Check for privilege escalation attempts
    if (options?.requestedPermissions && options.requestedPermissions.length > 0) {
      for (const reqPerm of options.requestedPermissions) {
        if (!manifestPermissions.includes(reqPerm)) {
          throw new Error(
            `Requested permission '${reqPerm}' is not declared in plugin manifest.`
          );
        }
        if (!isSuper && !installerPermissions.includes(reqPerm)) {
          throw new Error(
            `Privilege escalation denied: Installer role '${installer.role}' does not possess requested permission '${reqPerm}'.`
          );
        }
      }
    }

    // Compute granted permissions: manifest ∩ installer's effective ACL
    const candidatePermissions =
      options?.requestedPermissions && options.requestedPermissions.length > 0
        ? options.requestedPermissions
        : manifestPermissions;

    const grantedPermissions = isSuper
      ? candidatePermissions
      : candidatePermissions.filter((p) => installerPermissions.includes(p));

    // Upsert installation
    const existing = await db
      .select()
      .from(agentPluginInstallations)
      .where(
        and(
          eq(agentPluginInstallations.institutionId, installer.institutionId),
          eq(agentPluginInstallations.pluginId, pluginId)
        )
      )
      .limit(1);

    const now = new Date().toISOString();
    let installationRecord;

    if (existing.length > 0) {
      installationRecord = {
        ...existing[0],
        installedVersion: plugin.version,
        grantedToolPermissionsJson: JSON.stringify(grantedPermissions),
        configJson: JSON.stringify(options?.config || {}),
        enabled: options?.enabled ?? existing[0].enabled,
        updatedAt: now,
      };

      await db
        .update(agentPluginInstallations)
        .set({
          installedVersion: plugin.version,
          grantedToolPermissionsJson: JSON.stringify(grantedPermissions),
          configJson: JSON.stringify(options?.config || {}),
          enabled: options?.enabled ?? existing[0].enabled,
          updatedAt: now,
        })
        .where(eq(agentPluginInstallations.id, existing[0].id));
    } else {
      const installId = randomUUID();
      installationRecord = {
        id: installId,
        institutionId: installer.institutionId,
        pluginId,
        installedVersion: plugin.version,
        enabled: options?.enabled ?? true,
        grantedToolPermissionsJson: JSON.stringify(grantedPermissions),
        configJson: JSON.stringify(options?.config || {}),
        installedBy: installer.userId || null,
        lastRunAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(agentPluginInstallations).values(installationRecord);

      // Increment installed count
      await db
        .update(agentPlugins)
        .set({
          installedCount: sql`${agentPlugins.installedCount} + 1`,
          updatedAt: now,
        })
        .where(eq(agentPlugins.id, pluginId));
    }

    // Synchronous Merkle Audit Log
    await merkleAuditLedger.enqueueInvocation(
      {
        agentId: installer.userId || "system",
        toolName: "marketplace:install",
        institutionId: installer.institutionId,
        status: "success",
        durationMs: 0,
        inputHash: createHash("sha256")
          .update(JSON.stringify({ pluginId, options }))
          .digest("hex"),
        outputHash: createHash("sha256")
          .update(
            JSON.stringify({
              installationId: installationRecord.id,
              grantedPermissions,
            })
          )
          .digest("hex"),
      },
      { immediateFlush: true }
    );

    return installationRecord;
  }

  /**
   * Uninstall a plugin for a tenant.
   * Throws Error if not installed (mapped to 404).
   */
  public async uninstallPlugin(
    pluginId: string,
    institutionId: string,
    userId?: string
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(agentPluginInstallations)
      .where(
        and(
          eq(agentPluginInstallations.institutionId, institutionId),
          eq(agentPluginInstallations.pluginId, pluginId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Plugin is not installed on this institution.");
    }

    await db
      .delete(agentPluginInstallations)
      .where(eq(agentPluginInstallations.id, existing[0].id));

    // Decrement installed count
    await db
      .update(agentPlugins)
      .set({
        installedCount: sql`max(0, ${agentPlugins.installedCount} - 1)`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(agentPlugins.id, pluginId));

    // Synchronous Merkle Audit Log
    await merkleAuditLedger.enqueueInvocation(
      {
        agentId: userId || "system",
        toolName: "marketplace:uninstall",
        institutionId,
        status: "success",
        durationMs: 0,
        inputHash: createHash("sha256")
          .update(JSON.stringify({ pluginId, institutionId }))
          .digest("hex"),
        outputHash: createHash("sha256")
          .update(JSON.stringify({ uninstalled: true }))
          .digest("hex"),
      },
      { immediateFlush: true }
    );

    return true;
  }

  /**
   * List installed plugins for an institution.
   */
  public async listInstallations(institutionId: string): Promise<any[]> {
    const installations = await db
      .select()
      .from(agentPluginInstallations)
      .where(eq(agentPluginInstallations.institutionId, institutionId));

    if (installations.length === 0) return [];

    const pluginIds = installations.map((i) => i.pluginId);
    const plugins = await db
      .select()
      .from(agentPlugins)
      .where(
        or(...pluginIds.map((id) => eq(agentPlugins.id, id)))
      );

    const pluginMap = new Map(plugins.map((p) => [p.id, p]));

    return installations.map((inst) => ({
      ...inst,
      plugin: pluginMap.get(inst.pluginId) || null,
    }));
  }

  /**
   * Add or update a review and atomically recompute ratings using SQL aggregate.
   */
  public async addReview(
    pluginId: string,
    reviewer: { userId: string; institutionId: string; role?: string },
    rating: number,
    reviewText?: string
  ): Promise<any> {
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }

    const plugin = await this.getPlugin(pluginId, reviewer);
    if (!plugin) {
      throw new Error("Plugin not found.");
    }

    const existing = await db
      .select()
      .from(agentPluginReviews)
      .where(
        and(
          eq(agentPluginReviews.institutionId, reviewer.institutionId),
          eq(agentPluginReviews.pluginId, pluginId),
          eq(agentPluginReviews.reviewerStaffId, reviewer.userId)
        )
      )
      .limit(1);

    const now = new Date().toISOString();
    let reviewRecord;

    if (existing.length > 0) {
      reviewRecord = {
        ...existing[0],
        rating,
        reviewText: reviewText || null,
        updatedAt: now,
      };

      await db
        .update(agentPluginReviews)
        .set({
          rating,
          reviewText: reviewText || null,
          updatedAt: now,
        })
        .where(eq(agentPluginReviews.id, existing[0].id));
    } else {
      const reviewId = randomUUID();
      reviewRecord = {
        id: reviewId,
        institutionId: reviewer.institutionId,
        pluginId,
        reviewerStaffId: reviewer.userId,
        rating,
        reviewText: reviewText || null,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(agentPluginReviews).values(reviewRecord);
    }

    // Atomic SQL aggregation rollup for ratings (concurrency race proof)
    const reviewStats = await db
      .select({
        avgRating: sql<number>`coalesce(avg(${agentPluginReviews.rating}), 0)`,
        reviewCount: sql<number>`count(${agentPluginReviews.id})`,
      })
      .from(agentPluginReviews)
      .where(eq(agentPluginReviews.pluginId, pluginId));

    const avg = Number(reviewStats[0]?.avgRating ?? 0);
    const count = Number(reviewStats[0]?.reviewCount ?? 0);

    await db
      .update(agentPlugins)
      .set({
        ratingAvg: Math.round(avg * 10) / 10,
        ratingCount: count,
        updatedAt: now,
      })
      .where(eq(agentPlugins.id, pluginId));

    // Synchronous Merkle Audit Log
    await merkleAuditLedger.enqueueInvocation(
      {
        agentId: reviewer.userId,
        toolName: "marketplace:review",
        institutionId: reviewer.institutionId,
        status: "success",
        durationMs: 0,
        inputHash: createHash("sha256")
          .update(JSON.stringify({ pluginId, rating, reviewText }))
          .digest("hex"),
        outputHash: createHash("sha256")
          .update(
            JSON.stringify({
              reviewId: reviewRecord.id,
              ratingAvg: avg,
              ratingCount: count,
            })
          )
          .digest("hex"),
      },
      { immediateFlush: true }
    );

    return reviewRecord;
  }

  /**
   * Get reviews for a plugin.
   */
  public async getReviews(pluginId: string): Promise<any[]> {
    return await db
      .select()
      .from(agentPluginReviews)
      .where(eq(agentPluginReviews.pluginId, pluginId))
      .orderBy(desc(agentPluginReviews.createdAt));
  }
}

export const marketplaceEngine = MarketplaceEngine.getInstance();
