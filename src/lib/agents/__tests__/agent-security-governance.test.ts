import { MerkleAuditLedger } from "../guardrails/merkle-ledger";
import { AgentKillSwitch } from "../guardrails/kill-switch";
import { ToolExecutor } from "../tools/executor";
import { ToolRegistry } from "../tools/tool-registry";
import { AgentDbStore } from "../../db/agent-store";
import { academicTools } from "../tools/adapters/academic-tools";

describe("Agent Security, Governance & Merkle Audit Load Suite (AIG-027 / D11 / D12)", () => {
  let ledger: MerkleAuditLedger;
  let killSwitch: AgentKillSwitch;
  let store: AgentDbStore;
  let registry: ToolRegistry;
  let executor: ToolExecutor;

  beforeEach(() => {
    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    ledger = new MerkleAuditLedger(store);
    ledger.clearBuffer();

    killSwitch = new AgentKillSwitch(store);

    registry = ToolRegistry.getInstance();
    registry.clear();
    academicTools.forEach((t) => registry.registerTool(t));

    executor = new ToolExecutor({ registry, store, merkleLedger: ledger });
  });

  describe("Merkle Audit Chain & High-Throughput Load Testing (D11)", () => {
    it("maintains cryptographic hash pointer chaining under batch load (100+ entries)", async () => {
      const tenantId = "inst_load_test";
      ledger.setBatchSize(25); // batch flush every 25 entries

      const totalEntries = 120;
      for (let i = 0; i < totalEntries; i++) {
        await ledger.enqueueInvocation({
          agentId: "load-agent",
          toolName: "academic.attendance.reconcile",
          institutionId: tenantId,
          status: "success",
          durationMs: 15,
          inputHash: `input_hash_${i}`,
          outputHash: `output_hash_${i}`,
          traceId: `trace_${i}`,
        });
      }

      // Flush any trailing buffered entries
      await ledger.flushPendingInvocations(tenantId);

      const persisted = await store.listToolInvocations(tenantId);
      expect(persisted.length).toBe(totalEntries);

      // Verify full chain integrity
      const verification = await ledger.verifyChainIntegrity(tenantId);
      expect(verification.valid).toBe(true);
      expect(verification.totalEntries).toBe(totalEntries);
      expect(verification.tamperedIndex).toBeUndefined();
    });

    it("detects deliberate hash tampering and identifies the corrupted entry index", async () => {
      const tenantId = "inst_tamper_test";

      for (let i = 0; i < 5; i++) {
        await ledger.enqueueInvocation(
          {
            agentId: "tamper-agent",
            toolName: "academic.attendance.reconcile",
            institutionId: tenantId,
            status: "success",
            durationMs: 10,
            inputHash: `input_hash_${i}`,
            outputHash: `output_hash_${i}`,
          },
          { immediateFlush: true }
        );
      }

      // Verify chain is initially valid
      let verification = await ledger.verifyChainIntegrity(tenantId);
      expect(verification.valid).toBe(true);

      // Corrupt entry at index 2
      const entries = await store.listToolInvocations(tenantId);
      entries[2].auditHash = "corrupted_tampered_hash_value_1234567890";

      verification = await ledger.verifyChainIntegrity(tenantId);
      expect(verification.valid).toBe(false);
      expect(verification.tamperedIndex).toBe(3); // Broken chain detected at link 3 (pointing to broken hash)
    });

    it("enforces load gate backpressure when pending queue exceeds threshold", async () => {
      const tenantId = "inst_load_gate";
      ledger.setLoadGateThreshold(10); // set low threshold for test

      for (let i = 0; i < 10; i++) {
        await ledger.enqueueInvocation({
          agentId: "agent-1",
          toolName: "test.tool",
          institutionId: tenantId,
          status: "success",
          durationMs: 5,
          inputHash: `hash_${i}`,
        });
      }

      expect(ledger.isLoadGateExceeded(tenantId)).toBe(true);

      // 11th entry should be rejected with backpressure error
      await expect(
        ledger.enqueueInvocation({
          agentId: "agent-1",
          toolName: "test.tool",
          institutionId: tenantId,
          status: "success",
          durationMs: 5,
          inputHash: "hash_overflow",
        })
      ).rejects.toThrow(/load gate threshold exceeded/i);
    });
  });

  describe("Agent Kill-Switch & Step-Up Security Governance (D12)", () => {
    it("rejects emergency halt when session authentication is older than 5 minutes", async () => {
      const tenantId = "inst_kill_test";
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();

      const result = await killSwitch.engage(
        {
          userId: "admin_1",
          userRole: "admin",
          sessionAuthenticatedAt: sixMinutesAgo,
          confirmationText: "CONFIRM HALT ALL AGENTS",
        },
        "Testing session freshness",
        tenantId
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Session is older than 5 minutes|Re-authenticate/i);
      expect(killSwitch.isEngaged(tenantId)).toBe(false);
    });

    it("rejects emergency halt with invalid confirmation phrase", async () => {
      const tenantId = "inst_kill_test";
      const freshSession = new Date().toISOString();

      const result = await killSwitch.engage(
        {
          userId: "admin_1",
          userRole: "admin",
          sessionAuthenticatedAt: freshSession,
          confirmationText: "PLEASE STOP AGENTS", // Incorrect text
        },
        "Testing confirmation phrase",
        tenantId
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Confirmation text mismatch|CONFIRM HALT ALL AGENTS/i);
      expect(killSwitch.isEngaged(tenantId)).toBe(false);
    });

    it("rejects emergency halt by unauthorized roles (e.g. staff)", async () => {
      const tenantId = "inst_kill_test";
      const freshSession = new Date().toISOString();

      const result = await killSwitch.engage(
        {
          userId: "staff_1",
          userRole: "staff",
          sessionAuthenticatedAt: freshSession,
          confirmationText: "CONFIRM HALT ALL AGENTS",
        },
        "Unauthorized role attempt",
        tenantId
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not authorized/i);
    });

    it("engages and disengages emergency kill-switch with valid step-up credentials", async () => {
      const tenantId = "inst_kill_test";
      const freshSession = new Date().toISOString();

      const engageResult = await killSwitch.engage(
        {
          userId: "super_admin_1",
          userRole: "super_admin",
          sessionAuthenticatedAt: freshSession,
          confirmationText: "CONFIRM HALT ALL AGENTS",
        },
        "High-priority containment drill",
        tenantId
      );

      expect(engageResult.success).toBe(true);
      expect(killSwitch.isEngaged(tenantId)).toBe(true);

      // Disengage kill-switch with step-up auth and confirmation phrase
      const disengageResult = await killSwitch.disengage(
        {
          userId: "super_admin_1",
          userRole: "super_admin",
          sessionAuthenticatedAt: freshSession,
          confirmationText: "CONFIRM RESUME AGENTS",
        },
        tenantId
      );

      expect(disengageResult.success).toBe(true);
      expect(killSwitch.isEngaged(tenantId)).toBe(false);
    });
  });

  describe("Tenant & Permission Security Boundary Enforcement", () => {
    it("denies tool execution when institutionId is missing or empty", async () => {
      const result = await executor.executeTool(
        "academic-agent",
        "academic.attendance.reconcile",
        { sectionId: "sec-101", date: "2026-10-01" },
        { institutionId: "", userId: "u1", userRole: "admin", permissions: ["*"] }
      );

      expect(result.status).toBe("denied");
      expect(result.error).toMatch(/Tenant assertion failed/i);
    });

    it("denies tool execution when agent lacks required RBAC scope", async () => {
      const result = await executor.executeTool(
        "academic-agent",
        "academic.attendance.reconcile",
        { sectionId: "sec-101", date: "2026-10-01" },
        { institutionId: "inst_alpha", userId: "u1", userRole: "staff", permissions: ["other:permission"] }
      );

      expect(result.status).toBe("denied");
      expect(result.error).toMatch(/lacks required permission/i);
    });
  });
});
