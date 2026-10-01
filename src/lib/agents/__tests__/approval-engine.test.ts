import { ApprovalGateEngine } from "../approvals/approval-engine";
import { EscalationNotifier } from "../approvals/escalation-notifier";
import { AgentDbStore } from "../../db/agent-store";
import { AgentMessageBus } from "../core/message-bus";

describe("Approval Gate Engine, Decisions & SLA Expiry Suite (AIG-016)", () => {
  let engine: ApprovalGateEngine;
  let store: AgentDbStore;
  let bus: AgentMessageBus;
  let notifier: EscalationNotifier;

  beforeEach(() => {
    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    bus = AgentMessageBus.getInstance();
    bus.clear();

    notifier = new EscalationNotifier(bus);
    engine = new ApprovalGateEngine({ store, notifier });
  });

  it("creates approval gates and transitions to approved upon valid authorized decision", async () => {
    const run = await store.createWorkflowRun({
      workflowId: "wf_fee_closing",
      institutionId: "inst_alpha",
      status: "awaiting_approval",
    });

    const gate = await engine.createGate({
      runId: run.id,
      institutionId: "inst_alpha",
      requiredPermission: "agent:workflows:approve",
      severity: "high",
    });

    expect(gate.id).toBeDefined();
    expect(gate.status).toBe("pending");

    const decision = await engine.decideGate(
      gate.id,
      "approved",
      "staff_principal",
      "Approved after financial ledger inspection",
      "inst_alpha"
    );

    expect(decision.success).toBe(true);
    expect(decision.status).toBe("approved");

    const updatedRun = await store.getWorkflowRunById(run.id, "inst_alpha");
    expect(updatedRun?.status).toBe("running");
  });

  it("handles decision conflict on already-resolved gates (D14 offline replay protection)", async () => {
    const run = await store.createWorkflowRun({
      workflowId: "wf_exam_publish",
      institutionId: "inst_alpha",
      status: "awaiting_approval",
    });

    const gate = await engine.createGate({
      runId: run.id,
      institutionId: "inst_alpha",
    });

    // First decision resolves gate
    await engine.decideGate(gate.id, "approved", "admin_1", "First approver", "inst_alpha");

    // Second conflicting decision attempt (e.g. offline replayed packet)
    const secondDecision = await engine.decideGate(
      gate.id,
      "rejected",
      "admin_2",
      "Late offline rejection",
      "inst_alpha"
    );

    expect(secondDecision.success).toBe(false);
    expect(secondDecision.status).toBe("conflict");
    expect(secondDecision.error).toContain("already resolved");
  });

  it("scans expired approval gates, triggers escalation notices, and marks status expired", async () => {
    const receivedEscalations: string[] = [];
    bus.subscribe("approval.escalated", (msg) => {
      receivedEscalations.push(msg.payload.gateId as string);
    });

    const expiredIso = new Date(Date.now() - 3600000).toISOString();
    const gate = await engine.createGate({
      runId: "run_stale_1",
      institutionId: "inst_alpha",
      expiresAt: expiredIso,
      severity: "critical",
    });

    const scanResult = await engine.checkExpiredGates("inst_alpha");
    expect(scanResult.escalatedCount).toBe(1);
    expect(receivedEscalations).toContain(gate.id);

    const updatedGate = await store.getApprovalGateById(gate.id, "inst_alpha");
    expect(updatedGate?.status).toBe("expired");
  });
});
