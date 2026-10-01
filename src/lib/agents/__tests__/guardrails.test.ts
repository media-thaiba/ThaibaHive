import { PolicyEngine } from "../guardrails/policy-engine";
import { MerkleAuditLedger } from "../guardrails/merkle-ledger";
import { AgentKillSwitch } from "../guardrails/kill-switch";
import { AgentDbStore } from "../../db/agent-store";

describe("Safety Guardrails, Merkle Ledger & Emergency Kill-Switch Suite (AIG-017)", () => {
  let policyEngine: PolicyEngine;
  let merkleLedger: MerkleAuditLedger;
  let killSwitch: AgentKillSwitch;
  let store: AgentDbStore;

  beforeEach(() => {
    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    policyEngine = PolicyEngine.getInstance();
    merkleLedger = new MerkleAuditLedger(store);
    killSwitch = new AgentKillSwitch(store);
    killSwitch.clear();
  });

  describe("Policy Pre-Flight Constraints", () => {
    it("blocks unauthorized financial waivers exceeding threshold", () => {
      const staffTenant = {
        institutionId: "inst_alpha",
        userId: "user_staff_1",
        userRole: "staff",
        permissions: ["*"],
      };

      const evalRes = policyEngine.evaluatePreFlight(
        "finance.fees.waive",
        { amount: 30000 },
        staffTenant
      );

      expect(evalRes.allowed).toBe(false);
      expect(evalRes.violationReason).toContain("exceeds autonomous cap of 25,000");
    });

    it("allows waivers when executed with Principal role", () => {
      const principalTenant = {
        institutionId: "inst_alpha",
        userId: "user_principal_1",
        userRole: "principal",
        permissions: ["*"],
      };

      const evalRes = policyEngine.evaluatePreFlight(
        "finance.fees.waive",
        { amount: 30000 },
        principalTenant
      );

      expect(evalRes.allowed).toBe(true);
    });
  });

  describe("Merkle Audit Ledger & Tamper Detection", () => {
    it("verifies untampered Merkle hash chain", async () => {
      const genesis = await store.getLatestAuditHash("inst_alpha");

      await store.recordToolInvocation({
        agentId: "academic-agent",
        toolName: "academic.attendance.reconcile",
        institutionId: "inst_alpha",
        status: "success",
        inputHash: "in_1",
        auditHash: "audit_1",
        prevAuditHash: genesis,
        createdAt: "2026-10-01T10:00:00.000Z",
      });

      await store.recordToolInvocation({
        agentId: "academic-agent",
        toolName: "academic.grades.post_batch",
        institutionId: "inst_alpha",
        status: "success",
        inputHash: "in_2",
        auditHash: "audit_2",
        prevAuditHash: "audit_1",
        createdAt: "2026-10-01T10:00:01.000Z",
      });

      const verifyRes = await merkleLedger.verifyChainIntegrity("inst_alpha");
      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.totalEntries).toBe(2);
    });

    it("detects tampered audit hash chain pointer", async () => {
      const genesis = await store.getLatestAuditHash("inst_alpha");

      await store.recordToolInvocation({
        agentId: "academic-agent",
        toolName: "academic.attendance.reconcile",
        institutionId: "inst_alpha",
        status: "success",
        inputHash: "in_1",
        auditHash: "audit_1",
        prevAuditHash: genesis,
        createdAt: "2026-10-01T10:00:00.000Z",
      });

      // Insert corrupted/tampered row
      await store.recordToolInvocation({
        agentId: "academic-agent",
        toolName: "academic.grades.post_batch",
        institutionId: "inst_alpha",
        status: "success",
        inputHash: "in_2",
        auditHash: "audit_2",
        prevAuditHash: "CORRUPTED_PREV_HASH", // Tampered
        createdAt: "2026-10-01T10:00:01.000Z",
      });

      const verifyRes = await merkleLedger.verifyChainIntegrity("inst_alpha");
      expect(verifyRes.valid).toBe(false);
      expect(verifyRes.tamperedIndex).toBe(1);
      expect(verifyRes.error).toContain("Broken chain pointer");
    });
  });

  describe("Kill-Switch & Step-Up Auth Guardrails (D12)", () => {
    it("engages kill-switch with fresh step-up session and type-to-confirm phrase", async () => {
      const freshAuth = {
        userId: "admin_01",
        userRole: "admin",
        sessionAuthenticatedAt: new Date().toISOString(),
        confirmationText: "CONFIRM HALT ALL AGENTS",
      };

      const engageRes = await killSwitch.engage(freshAuth, "Security anomaly detected", "inst_alpha");
      expect(engageRes.success).toBe(true);
      expect(killSwitch.isEngaged("inst_alpha")).toBe(true);
    });

    it("rejects kill-switch engagement when session is older than 5 minutes", async () => {
      const staleAuth = {
        userId: "admin_01",
        userRole: "admin",
        sessionAuthenticatedAt: new Date(Date.now() - 400000).toISOString(), // 6.6 mins old
        confirmationText: "CONFIRM HALT ALL AGENTS",
      };

      const engageRes = await killSwitch.engage(staleAuth, "Emergency", "inst_alpha");
      expect(engageRes.success).toBe(false);
      expect(engageRes.error).toContain("Session is older than 5 minutes");
      expect(killSwitch.isEngaged("inst_alpha")).toBe(false);
    });

    it("rejects kill-switch when confirmation phrase does not match", async () => {
      const wrongPhraseAuth = {
        userId: "admin_01",
        userRole: "admin",
        sessionAuthenticatedAt: new Date().toISOString(),
        confirmationText: "halt",
      };

      const engageRes = await killSwitch.engage(wrongPhraseAuth, "Emergency", "inst_alpha");
      expect(engageRes.success).toBe(false);
      expect(engageRes.error).toContain("Confirmation text mismatch");
    });
  });

  describe("Rollback Coordinator (Saga & State Recovery)", () => {
    it("executes coordinated rollback and marks workflow run status as cancelled", async () => {
      const { rollbackCoordinator } = await import("../guardrails/rollback-coordinator");
      const testTenant = {
        institutionId: "inst_alpha",
        userId: "admin_01",
        userRole: "admin",
        permissions: ["*"],
      };

      const run = await store.createWorkflowRun({
        workflowId: "academic-sync",
        institutionId: "inst_alpha",
        status: "running",
        triggeredBy: "user_admin",
        triggerType: "manual",
        context: {},
      });

      await store.createWorkflowStep({
        runId: run.id,
        institutionId: "inst_alpha",
        agentId: "academic-agent",
        stepKey: "step-attendance",
        status: "completed",
        input: { sectionId: "sec-101", date: "2026-10-01" },
        output: { toolName: "academic.attendance.reconcile", reconciledCount: 42 },
      });

      const summary = await rollbackCoordinator.initiateRollback({
        runId: run.id,
        tenant: testTenant,
        reason: "Manual safety override",
        requestedBy: "admin_01",
      });

      expect(summary.success).toBe(true);
      const updatedRun = await store.getWorkflowRunById(run.id, "inst_alpha");
      expect(updatedRun?.status).toBe("cancelled");
      expect(updatedRun?.error).toContain("Rolled back: Manual safety override");
    });
  });
});

