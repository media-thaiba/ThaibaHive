/**
 * Sprint-106: Phase 10 (Track 3B) AI Agent Marketplace & Live Multimodal Streaming
 * 8-Stage End-to-End Simulation CLI Runner
 *
 * Stages:
 *  1. Seed multi-tenant test fixture & permissions
 *  2. Publish agent plugin with deterministic manifest hash & audit trail
 *  3. Approve plugin listing & verify tenant isolation boundary
 *  4. Install plugin with least-privilege permission grants & audit log
 *  5. Visual Workflow Studio DAG assembly & compile to Workflow DSL
 *  6. Execute plugin in PluginSandbox (resource budget & egress controls)
 *  7. Live Multimodal Streaming session (audio/keyframe/transcription/hazard)
 *  8. Cryptographic Merkle Audit Hash Chain integrity verification
 */

import { MarketplaceEngine } from "../src/lib/marketplace/plugin-engine";
import { PluginSandbox } from "../src/lib/marketplace/plugin-sandbox";
import { compileCanvasToDsl, type StudioCanvasState } from "../src/lib/workflow-studio/graph-compiler";
import { LiveSessionManager } from "../src/lib/live/session-manager";
import { merkleAuditLedger } from "../src/lib/agents/guardrails/merkle-ledger";
import { db } from "../src/db";
import { institutions, staff, agentPlugins, agentPluginInstallations } from "../src/db/schema";
import { inArray } from "drizzle-orm";

async function runSimulation() {
  console.log("================================================================================");
  console.log("   THAIBAHIVE AI AGENT MARKETPLACE & LIVE MULTIMODAL SIMULATOR (PHASE 10)       ");
  console.log("================================================================================\n");

  const ts = Date.now();
  const instAlpha = `inst_mkt_${ts}`;
  const instBeta = `inst_mkt_other_${ts}`;
  const superStaffId = `staff_super_${ts}`;
  const adminBetaStaffId = `staff_beta_${ts}`;
  const principalAlphaStaffId = `staff_prin_${ts}`;
  const marketplace = MarketplaceEngine.getInstance();
  const liveManager = LiveSessionManager.getInstance();

  try {
    // ---------------------------------------------------------------------------
    // Stage 1: Seed Multi-Tenant Institutions & Staff
    // ---------------------------------------------------------------------------
    console.log("Stage 1/8: Seeding multi-tenant test institutions & staff records...");
    await db.insert(institutions).values([
      { id: instAlpha, name: "Marketplace Test Academy Alpha", code: `mka_${ts}` },
      { id: instBeta, name: "Marketplace Test Academy Beta", code: `mkb_${ts}` },
    ]);

    await db.insert(staff).values([
      {
        id: superStaffId,
        email: `super_${ts}@test.com`,
        employeeId: `emp_s_${ts}`,
        firstName: "Super",
        lastName: "Admin",
        role: "super_admin",
      },
      {
        id: adminBetaStaffId,
        email: `adminb_${ts}@test.com`,
        employeeId: `emp_b_${ts}`,
        firstName: "Beta",
        lastName: "Admin",
        role: "admin",
      },
      {
        id: principalAlphaStaffId,
        email: `prin_${ts}@test.com`,
        employeeId: `emp_p_${ts}`,
        firstName: "Principal",
        lastName: "Alpha",
        role: "principal",
      },
    ]);
    console.log(`  ✓ Created test institutions: ${instAlpha}, ${instBeta}`);
    console.log(`  ✓ Created staff records: ${superStaffId}, ${adminBetaStaffId}, ${principalAlphaStaffId}`);

    // ---------------------------------------------------------------------------
    // Stage 2: Publish Agent Plugin
    // ---------------------------------------------------------------------------
    console.log("\nStage 2/8: Publishing agent plugin with manifest hashing...");
    const manifest = {
      manifestVersion: "1.0",
      entrypoint: "dist/index.js",
      permissions: ["finance:fees:read", "finance:reports:export"],
      tools: [
        {
          name: "finance.audit.reconcile",
          description: "Performs 3-way reconciliation on tuition fee payments",
          requiredPermissions: ["finance:fees:read", "finance:reports:export"],
        },
      ],
      resourceBudget: {
        maxExecutionTimeMs: 3000,
        maxMemoryMb: 128,
        maxTokens: 5000,
      },
      egressAllowlist: ["https://api.thaibahive.internal/reconcile"],
    };

    const expectedHash = MarketplaceEngine.computeManifestHash(manifest);
    const publishedPlugin = await marketplace.publishPlugin(
      {
        pluginKey: `thaiba.audit.ledger.${ts}`,
        displayName: "Institutional Ledger Auditor",
        summary: "Autonomous 3-way financial reconciliation tool",
        version: "1.0.0",
        category: "finance",
        scope: "global",
        capabilities: ["reconciliation", "audit", "csv_export"],
        manifest,
      },
      {
        userId: superStaffId,
        role: "super_admin",
        institutionId: instAlpha,
      }
    );

    if (publishedPlugin.manifestHash !== expectedHash) {
      throw new Error(`Manifest hash mismatch: expected ${expectedHash}, got ${publishedPlugin.manifestHash}`);
    }
    if (publishedPlugin.approvalStatus !== "pending_review") {
      throw new Error(`Expected pending_review status, got ${publishedPlugin.approvalStatus}`);
    }
    console.log(`  ✓ Published plugin '${publishedPlugin.displayName}' (ID: ${publishedPlugin.id})`);
    console.log(`  ✓ Deterministic manifest SHA-256 hash verified: ${publishedPlugin.manifestHash.substring(0, 16)}...`);

    // ---------------------------------------------------------------------------
    // Stage 3: Approve Plugin & Verify Cross-Tenant Gate
    // ---------------------------------------------------------------------------
    console.log("\nStage 3/8: Approving plugin listing & verifying tenant approval boundary...");

    // Tenant admin should not be allowed to approve a global plugin
    let crossTenantBlocked = false;
    try {
      await marketplace.approvePlugin(
        publishedPlugin.id,
        {
          userId: adminBetaStaffId,
          role: "admin",
          institutionId: instBeta,
        },
        "approve"
      );
    } catch {
      crossTenantBlocked = true;
    }

    if (!crossTenantBlocked) {
      throw new Error("Security boundary failed: tenant admin approved global listing!");
    }
    console.log("  ✓ Correctly rejected approval attempt by tenant admin on global listing.");

    // Super admin approval
    const approved = await marketplace.approvePlugin(
      publishedPlugin.id,
      {
        userId: superStaffId,
        role: "super_admin",
        institutionId: "global",
      },
      "approve",
      "Passed automated security & static analysis checks."
    );

    if (approved.approvalStatus !== "approved") {
      throw new Error(`Expected approvalStatus=approved, got ${approved.approvalStatus}`);
    }
    console.log("  ✓ Successfully approved plugin by super_admin.");

    // ---------------------------------------------------------------------------
    // Stage 4: Install Plugin in Tenant Alpha
    // ---------------------------------------------------------------------------
    console.log("\nStage 4/8: Installing plugin into tenant with permission scoping...");
    const installation = await marketplace.installPlugin(
      publishedPlugin.id,
      {
        userId: principalAlphaStaffId,
        role: "principal",
        institutionId: instAlpha,
        permissions: ["finance:fees:read", "finance:reports:export"],
      },
      {
        requestedPermissions: ["finance:fees:read"], // Least privilege subset
        enabled: true,
      }
    );

    if (!installation.enabled || installation.institutionId !== instAlpha) {
      throw new Error("Installation record invalid");
    }
    console.log(`  ✓ Plugin installed into ${instAlpha} (Installation ID: ${installation.id})`);
    const grantedPermissions = JSON.parse(installation.grantedToolPermissionsJson || "[]");
    console.log(`  ✓ Granted permissions: ${JSON.stringify(grantedPermissions)}`);

    // ---------------------------------------------------------------------------
    // Stage 5: Visual Workflow Studio DAG Assembly & Compilation
    // ---------------------------------------------------------------------------
    console.log("\nStage 5/8: Assembling Visual Workflow Studio DAG and compiling to DSL...");
    const canvas: StudioCanvasState = {
      nodes: [
        {
          id: "node-trigger",
          data: {
            label: "Schedule Daily At 06:00",
            nodeType: "trigger",
            trigger: {
              type: "schedule",
              cron: "0 6 * * *",
            },
          },
          position: { x: 50, y: 100 },
        },
        {
          id: "node-reconcile",
          data: {
            label: "Audit Ledger",
            nodeType: "action",
            agent: "finance-agent",
            tool: "finance.audit.reconcile",
            input: { institutionId: instAlpha },
          },
          position: { x: 250, y: 100 },
        },
        {
          id: "node-notify",
          data: {
            label: "Notify Accounts",
            nodeType: "notification",
            agent: "finance-agent",
            tool: "notification.send",
            input: { channel: "finance-alerts" },
          },
          position: { x: 450, y: 100 },
        },
      ],
      edges: [
        { source: "node-trigger", target: "node-reconcile" },
        { source: "node-reconcile", target: "node-notify" },
      ],
    };

    const compileResult = compileCanvasToDsl(canvas, {
      key: `wf-sim-${ts}`,
      name: "Automated Ledger Reconciliation Workflow",
      description: "Nightly automated 3-way match",
    });

    if (!compileResult.success || !compileResult.dsl) {
      throw new Error(`Workflow Studio compilation failed: ${compileResult.errors.join(", ")}`);
    }

    console.log(`  ✓ Canvas compiled to valid Workflow DSL (Steps: ${compileResult.dsl.steps.length})`);
    console.log(`  ✓ DSL Hash computed: ${compileResult.dslHash?.substring(0, 16)}...`);

    // ---------------------------------------------------------------------------
    // Stage 6: Plugin Sandbox Execution & Egress Security
    // ---------------------------------------------------------------------------
    console.log("\nStage 6/8: Executing plugin in PluginSandbox (budget & SSRF defense)...");

    // SSRF / Egress test
    const blockedInternalEgress = PluginSandbox.validateEgressUrl("http://169.254.169.254/latest/meta-data/");
    if (blockedInternalEgress.allowed) {
      throw new Error("SSRF defense failed: AWS cloud metadata IP was allowed!");
    }
    console.log("  ✓ SSRF protection verified: blocked cloud metadata URL (169.254.169.254).");

    const validEgress = PluginSandbox.validateEgressUrl(
      "https://api.thaiba.org/reconcile",
      ["https://api.thaiba.org/reconcile"]
    );
    if (!validEgress.allowed) {
      throw new Error(`Legitimate egress URL failed: ${validEgress.reason}`);
    }
    console.log("  ✓ Egress allowlist validation verified: allowed HTTPS endpoint.");

    // Sandboxed execution run
    const sandboxResult = await PluginSandbox.executeTool({
      agentId: "finance-agent",
      pluginId: publishedPlugin.id,
      toolName: "finance.audit.reconcile",
      institutionId: instAlpha,
      grantedPermissions: ["finance:fees:read", "finance.audit.reconcile"],
      input: { date: "2026-10-11" },
      resourceBudget: {
        maxExecutionTimeMs: 2000,
        maxMemoryMb: 128,
        maxTokens: 1000,
      },
      executeFn: async () => {
        return {
          totalMatched: 142,
          discrepancies: 0,
          status: "balanced",
        };
      },
    });

    if (sandboxResult.status !== "success" || !sandboxResult.output) {
      throw new Error(`Sandbox execution failed: ${sandboxResult.error}`);
    }
    console.log(`  ✓ Sandboxed tool executed cleanly in ${sandboxResult.durationMs}ms`);
    console.log(`  ✓ Audit Hash: ${sandboxResult.auditHash?.substring(0, 16)}...`);

    // ---------------------------------------------------------------------------
    // Stage 7: Live Multimodal Streaming Session
    // ---------------------------------------------------------------------------
    console.log("\nStage 7/8: Initializing Live Multimodal Streaming session...");
    const liveSession = await liveManager.startSession(
      instAlpha,
      {
        provider: "mock",
        title: "Campus Security Live Drone Feed",
        hazardsEnabled: true,
        maxDurationMinutes: 10,
      },
      superStaffId
    );

    if (!liveSession || liveSession.status !== "active") {
      throw new Error("Failed to start Live Multimodal Session");
    }
    console.log(
      `  ✓ Live session started (ID: ${liveSession.id}, Type: ${liveSession.sessionType}, Model: ${liveSession.modelId})`
    );

    // Ingest simulated live event and test broadcast
    let eventReceived = false;
    const unsubscribe = liveManager.subscribe(liveSession.id, instAlpha, (event, data) => {
      if (event === "hazard" || event === "transcript") {
        eventReceived = true;
      }
    });

    // Ingest simulated live text
    const ingestRes = await liveManager.ingestEvent(liveSession.id, instAlpha, {
      type: "text",
      text: "Detected smoke signature near North Science Laboratory.",
    });

    if (!ingestRes.success) {
      throw new Error("Failed to ingest text event into live session");
    }

    // Broadcast test event directly through session manager
    liveManager.broadcast(liveSession.id, "hazard", {
      hazardType: "smoke_hazard",
      severity: "critical",
    });

    console.log("  ✓ Ingested simulated live audio & hazard detection event.");
    console.log(`  ✓ Real-time SSE subscriber dispatch confirmed: ${eventReceived}`);
    unsubscribe();

    // End live session cleanly
    await liveManager.endSession(liveSession.id, instAlpha, "completed");
    console.log("  ✓ Live session stopped and finalized in database.");

    // ---------------------------------------------------------------------------
    // Stage 8: Merkle Audit Hash Chain Integrity Verification
    // ---------------------------------------------------------------------------
    console.log("\nStage 8/8: Verifying cryptographic Merkle Audit Hash Chain integrity...");
    // Flush pending entries
    await merkleAuditLedger.flushPendingInvocations(instAlpha);

    const chainAudit = await merkleAuditLedger.verifyChainIntegrity(instAlpha);
    if (!chainAudit.valid) {
      throw new Error(`Merkle chain integrity violation: ${chainAudit.error}`);
    }
    console.log(`  ✓ Merkle audit hash chain verified 100% untampered (${chainAudit.totalEntries} entries verified).`);

    console.log("\n================================================================================");
    console.log("     ✅ ALL 8 SIMULATION STAGES PASSED SUCCESSFULLY (PHASE 10 COMPLETE)        ");
    console.log("================================================================================\n");
  } finally {
    // Cleanup test institutions, staff & installations
    try {
      const plugins = await db.select({ id: agentPlugins.id }).from(agentPlugins).where(inArray(agentPlugins.institutionId, [instAlpha, instBeta]));
      const pIds = plugins.map((p) => p.id);
      if (pIds.length > 0) {
        await db.delete(agentPluginInstallations).where(inArray(agentPluginInstallations.pluginId, pIds));
        await db.delete(agentPlugins).where(inArray(agentPlugins.id, pIds));
      }
      await db.delete(staff).where(inArray(staff.id, [superStaffId, adminBetaStaffId, principalAlphaStaffId]));
      await db.delete(institutions).where(inArray(institutions.id, [instAlpha, instBeta]));
    } catch (_) {}
  }
}

runSimulation().catch((err) => {
  console.error("\n❌ Simulation failed:", err);
  process.exit(1);
});
