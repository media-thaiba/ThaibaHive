import { MarketplaceEngine } from "../plugin-engine";
import { db } from "@/db";
import {
  agentPlugins,
  agentPluginInstallations,
  agentPluginReviews,
  institutions,
  staff,
} from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import { merkleAuditLedger } from "@/lib/agents/guardrails/merkle-ledger";

describe("MarketplaceEngine", () => {
  const ts = Date.now();
  const tenantA = `inst_mkt_a_${ts}`;
  const tenantB = `inst_mkt_b_${ts}`;
  const author1 = `usr_auth_1_${ts}`;
  const author2 = `usr_auth_2_${ts}`;
  const adminA = `usr_admin_a_${ts}`;
  const adminB = `usr_admin_b_${ts}`;
  const superUser = `usr_super_${ts}`;
  const staffUser = `usr_staff_${ts}`;
  const rev1 = `usr_rev_1_${ts}`;
  const rev2 = `usr_rev_2_${ts}`;
  const rev3 = `usr_rev_3_${ts}`;

  const allStaffIds = [
    author1,
    author2,
    adminA,
    adminB,
    superUser,
    staffUser,
    rev1,
    rev2,
    rev3,
  ];

  const engine = MarketplaceEngine.getInstance();

  beforeAll(async () => {
    await db.insert(institutions).values([
      { id: tenantA, name: "Marketplace Campus A", code: `mka_${ts}` },
      { id: tenantB, name: "Marketplace Campus B", code: `mkb_${ts}` },
    ]);

    await db.insert(staff).values([
      { id: author1, email: `auth1_${ts}@test.com`, employeeId: `emp1_${ts}`, firstName: "Author", lastName: "One", role: "admin" },
      { id: author2, email: `auth2_${ts}@test.com`, employeeId: `emp2_${ts}`, firstName: "Author", lastName: "Two", role: "staff" },
      { id: adminA, email: `admina_${ts}@test.com`, employeeId: `empa_${ts}`, firstName: "Admin", lastName: "A", role: "admin" },
      { id: adminB, email: `adminb_${ts}@test.com`, employeeId: `empb_${ts}`, firstName: "Admin", lastName: "B", role: "admin" },
      { id: superUser, email: `super_${ts}@test.com`, employeeId: `emps_${ts}`, firstName: "Super", lastName: "Admin", role: "super_admin" },
      { id: staffUser, email: `staff_${ts}@test.com`, employeeId: `empt_${ts}`, firstName: "Staff", lastName: "User", role: "staff" },
      { id: rev1, email: `rev1_${ts}@test.com`, employeeId: `empr1_${ts}`, firstName: "Rev", lastName: "One", role: "staff" },
      { id: rev2, email: `rev2_${ts}@test.com`, employeeId: `empr2_${ts}`, firstName: "Rev", lastName: "Two", role: "staff" },
      { id: rev3, email: `rev3_${ts}@test.com`, employeeId: `empr3_${ts}`, firstName: "Rev", lastName: "Three", role: "staff" },
    ]);
  });

  afterAll(async () => {
    await db.delete(agentPluginReviews).where(inArray(agentPluginReviews.institutionId, [tenantA, tenantB]));
    await db.delete(agentPluginInstallations).where(inArray(agentPluginInstallations.institutionId, [tenantA, tenantB]));
    await db.delete(agentPlugins).where(inArray(agentPlugins.institutionId, [tenantA, tenantB]));
    // Also delete any global plugins created by superUser
    await db.delete(agentPlugins).where(eq(agentPlugins.authorStaffId, superUser));
    await db.delete(staff).where(inArray(staff.id, allStaffIds));
    await db.delete(institutions).where(inArray(institutions.id, [tenantA, tenantB]));
  });

  describe("Publishing & Semver Uniqueness", () => {
    it("publishes a plugin with canonical manifest hash and pending_review status", async () => {
      const plugin = await engine.publishPlugin(
        {
          pluginKey: `com.thaiba.fee-reminder-${ts}`,
          displayName: "Automated Fee Reminder Agent",
          summary: "Dispatches smart payment notifications across WhatsApp and SMS.",
          version: "1.0.0",
          scope: "institution_private",
          category: "finance",
          capabilities: ["messaging", "finance", "automation"],
          manifest: {
            permissions: ["finance:fees:read", "notifications:send"],
            resourceBudget: { maxExecutionTimeMs: 3000 },
          },
        },
        { userId: author1, role: "admin", institutionId: tenantA }
      );

      expect(plugin.id).toBeDefined();
      expect(plugin.approvalStatus).toBe("pending_review");
      expect(plugin.manifestHash).toHaveLength(64);
      expect(plugin.institutionId).toBe(tenantA);

      // Verify Semver uniqueness check
      await expect(
        engine.publishPlugin(
          {
            pluginKey: `com.thaiba.fee-reminder-${ts}`,
            displayName: "Duplicate Version Plugin",
            summary: "Should fail duplicate check",
            version: "1.0.0",
            scope: "institution_private",
            category: "finance",
            capabilities: ["messaging"],
            manifest: { permissions: [] },
          },
          { userId: author1, role: "admin", institutionId: tenantA }
        )
      ).rejects.toThrow(/already exists/);
    });
  });

  describe("Approval Pipeline & Global Approval Restriction", () => {
    it("enforces that only super_admin or system can approve global listings", async () => {
      // Publish global plugin
      const globalPlugin = await engine.publishPlugin(
        {
          pluginKey: `com.thaiba.global-compliance-${ts}`,
          displayName: "Global Compliance Watchdog",
          summary: "Universal compliance and security checker",
          version: "1.0.0",
          scope: "global",
          category: "compliance",
          capabilities: ["audit"],
          manifest: { permissions: ["compliance:read"] },
        },
        { userId: adminA, role: "admin", institutionId: tenantA }
      );

      // Regular tenant admin approval attempt on global plugin MUST fail with 403 / Forbidden
      await expect(
        engine.approvePlugin(
          globalPlugin.id,
          { userId: adminA, role: "admin", institutionId: tenantA },
          "approve"
        )
      ).rejects.toThrow(/Forbidden: Global plugins can only be approved by super_admin or system/);

      // Super admin approval succeeds
      const approved = await engine.approvePlugin(
        globalPlugin.id,
        { userId: superUser, role: "super_admin" },
        "approve"
      );
      expect(approved.approvalStatus).toBe("approved");
    });

    it("allows tenant admin to approve own-institution plugin and blocks cross-tenant approval", async () => {
      const tenantPlugin = await engine.publishPlugin(
        {
          pluginKey: `com.thaiba.campus-bot-${ts}`,
          displayName: "Campus Assistant Bot",
          summary: "Tenant specific bot",
          version: "1.0.0",
          scope: "institution_private",
          category: "facilities",
          capabilities: ["assistant"],
          manifest: { permissions: [] },
        },
        { userId: author2, role: "staff", institutionId: tenantA }
      );

      // Cross-tenant approval attempt by tenant B admin fails
      await expect(
        engine.approvePlugin(
          tenantPlugin.id,
          { userId: adminB, role: "admin", institutionId: tenantB },
          "approve"
        )
      ).rejects.toThrow(/Forbidden/);

      // Tenant A admin approval succeeds
      const approved = await engine.approvePlugin(
        tenantPlugin.id,
        { userId: adminA, role: "admin", institutionId: tenantA },
        "approve"
      );
      expect(approved.approvalStatus).toBe("approved");
    });
  });

  describe("Manifest Tamper & Re-Approval Invalidation", () => {
    it("flips approved plugin back to pending_review when manifest is mutated", async () => {
      const plugin = await engine.publishPlugin(
        {
          pluginKey: `com.thaiba.tamper-test-${ts}`,
          displayName: "Tamper Test Agent",
          summary: "Testing manifest tamper defense",
          version: "1.0.0",
          scope: "institution_private",
          category: "academic",
          capabilities: ["test"],
          manifest: { permissions: ["classes:read"] },
        },
        { userId: author1, role: "admin", institutionId: tenantA }
      );

      await engine.approvePlugin(
        plugin.id,
        { userId: adminA, role: "admin", institutionId: tenantA },
        "approve"
      );

      // Mutate manifest with new permission
      const updated = await engine.updatePluginManifest(
        plugin.id,
        { permissions: ["classes:read", "classes:create"] },
        { userId: author1, role: "admin", institutionId: tenantA }
      );

      expect(updated.approvalStatus).toBe("pending_review");
      expect(updated.manifestHash).not.toBe(plugin.manifestHash);
    });
  });

  describe("Tenant Visibility Rules", () => {
    it("restricts visibility of unapproved plugins to author tenant and super_admin", async () => {
      const unapproved = await engine.publishPlugin(
        {
          pluginKey: `com.thaiba.secret-tool-${ts}`,
          displayName: "Secret Tool",
          summary: "Internal tool",
          version: "1.0.0",
          scope: "institution_private",
          category: "hr",
          capabilities: [],
          manifest: { permissions: [] },
        },
        { userId: author1, role: "admin", institutionId: tenantA }
      );

      // Tenant A can see it
      const visibleToA = await engine.getPlugin(unapproved.id, {
        userId: staffUser,
        role: "staff",
        institutionId: tenantA,
      });
      expect(visibleToA).not.toBeNull();

      // Tenant B cannot see it
      const visibleToB = await engine.getPlugin(unapproved.id, {
        userId: staffUser,
        role: "staff",
        institutionId: tenantB,
      });
      expect(visibleToB).toBeNull();

      // Super admin can see it
      const visibleToSuper = await engine.getPlugin(unapproved.id, {
        userId: superUser,
        role: "super_admin",
      });
      expect(visibleToSuper).not.toBeNull();
    });
  });

  describe("Escalation-Proof Capability Gating & Install/Uninstall", () => {
    it("computes granted permissions as manifest ∩ installer ACL and blocks privilege escalation", async () => {
      const plugin = await engine.publishPlugin(
        {
          pluginKey: `com.thaiba.finance-bot-${ts}`,
          displayName: "Finance Bot",
          summary: "Automates fee collection and ledger postings",
          version: "1.0.0",
          scope: "institution_private",
          category: "finance",
          capabilities: ["finance"],
          manifest: {
            permissions: ["finance:reports:read", "super_admin_secret:execute"],
          },
        },
        { userId: adminA, role: "admin", institutionId: tenantA }
      );

      await engine.approvePlugin(
        plugin.id,
        { userId: adminA, role: "admin", institutionId: tenantA },
        "approve"
      );

      // Staff installer attempts to install with explicit unheld permission (privilege escalation)
      await expect(
        engine.installPlugin(
          plugin.id,
          {
            userId: staffUser,
            role: "staff",
            institutionId: tenantA,
            permissions: ["profile:read"],
          },
          { requestedPermissions: ["super_admin_secret:execute"] }
        )
      ).rejects.toThrow(/Privilege escalation denied/);

      // Admin installer with valid finance permissions
      const install = await engine.installPlugin(
        plugin.id,
        {
          userId: adminA,
          role: "admin",
          institutionId: tenantA,
          permissions: ["finance:reports:read"],
        }
      );

      expect(install.id).toBeDefined();
      const granted = JSON.parse(install.grantedToolPermissionsJson);
      expect(granted).toContain("finance:reports:read");
      expect(granted).not.toContain("super_admin_secret:execute");

      // Verify installed count incremented on plugin
      const updatedPlugin = await engine.getPlugin(plugin.id, {
        role: "super_admin",
      });
      expect(updatedPlugin.installedCount).toBe(1);

      // Verify uninstall
      await engine.uninstallPlugin(plugin.id, tenantA, adminA);
      const uninstalledCount = (
        await engine.getPlugin(plugin.id, { role: "super_admin" })
      ).installedCount;
      expect(uninstalledCount).toBe(0);

      // Missing uninstall throws error (to map to 404)
      await expect(
        engine.uninstallPlugin(plugin.id, tenantA, adminA)
      ).rejects.toThrow(/not installed/);
    });
  });

  describe("Atomic Reviews & Rating Rollup", () => {
    it("atomically rolls up rating average and count across multiple reviews", async () => {
      const plugin = await engine.publishPlugin(
        {
          pluginKey: `com.thaiba.rating-test-${ts}`,
          displayName: "Rating Test Plugin",
          summary: "Testing atomic rating calculations",
          version: "1.0.0",
          scope: "global",
          category: "general",
          capabilities: [],
          manifest: { permissions: [] },
        },
        { userId: superUser, role: "super_admin" }
      );

      await engine.approvePlugin(
        plugin.id,
        { userId: superUser, role: "super_admin" },
        "approve"
      );

      // Review 1: Rating 5
      await engine.addReview(
        plugin.id,
        { userId: rev1, institutionId: tenantA },
        5,
        "Outstanding plugin!"
      );

      let p = await engine.getPlugin(plugin.id, { role: "super_admin" });
      expect(p.ratingAvg).toBe(5);
      expect(p.ratingCount).toBe(1);

      // Review 2: Rating 3
      await engine.addReview(
        plugin.id,
        { userId: rev2, institutionId: tenantB },
        3,
        "Good but needs work"
      );

      p = await engine.getPlugin(plugin.id, { role: "super_admin" });
      expect(p.ratingAvg).toBe(4); // (5 + 3) / 2 = 4.0
      expect(p.ratingCount).toBe(2);

      // Review 3: Rating 4
      await engine.addReview(
        plugin.id,
        { userId: rev3, institutionId: tenantA },
        4,
        "Solid 4 stars"
      );

      p = await engine.getPlugin(plugin.id, { role: "super_admin" });
      expect(p.ratingAvg).toBe(4); // (5 + 3 + 4) / 3 = 4.0
      expect(p.ratingCount).toBe(3);
    });
  });
});
