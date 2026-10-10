import { remediationRuntime } from "../runtime";
import { RemediationPlan } from "../types";

describe("RemediationRuntime", () => {
  const mockCtx = {
    institutionId: "inst_test_rem_001",
    staffId: "staff_test_rem_001",
    stepUpFreshnessSeconds: 60,
  };

  it("executes automated 2-step remediation plan successfully", async () => {
    const plan: RemediationPlan = {
      id: "plan_auto_001",
      name: "Fee Discrepancy Auto-Triage",
      description: "Detects and reconciles minor fee variances",
      triggerType: "copilot",
      steps: [
        {
          id: "step_1",
          name: "Scan Discrepancies",
          tool: "finance.getFeeDiscrepancies",
          params: {},
        },
        {
          id: "step_2",
          name: "Send Multicast Notice",
          tool: "notification.sendMulticast",
          params: { title: "Fee Audit Complete", body: "Reconciliation complete." },
        },
      ],
    };

    const result = await remediationRuntime.executePlan(plan, mockCtx);
    expect(result.status).toBe("completed");
    expect(result.completedSteps).toBe(2);
    expect(result.stepResults[0].status).toBe("completed");
    expect(result.stepResults[1].status).toBe("completed");
  });

  it("pauses execution and generates gate when step requires HITL", async () => {
    const plan: RemediationPlan = {
      id: "plan_hitl_001",
      name: "Critical Fee Adjustment",
      description: "Requires principal approval",
      triggerType: "copilot",
      steps: [
        {
          id: "step_hitl_1",
          name: "Reconcile Big Variance",
          tool: "finance.reconcileFee",
          params: { invoiceId: "inv_999", adjustmentAmount: 5000 },
          requiresHitl: true,
          hitlRole: "principal",
        },
      ],
    };

    const result = await remediationRuntime.executePlan(plan, mockCtx);
    expect(result.status).toBe("waiting_approval");
    expect(result.stepResults[0].status).toBe("waiting_approval");
    expect(result.stepResults[0].gateId).toBeDefined();

    const gateId = result.stepResults[0].gateId!;
    const gate = remediationRuntime.getGate(gateId);
    expect(gate).toBeDefined();
    expect(gate?.status).toBe("pending");

    // Resume gate
    const resumedResult = await remediationRuntime.resumeGate(gateId, "approve", mockCtx);
    expect(resumedResult.status).toBe("completed");
  });

  it("enforces D12 Step-Up auth freshness on high-risk gates", async () => {
    const plan: RemediationPlan = {
      id: "plan_stepup_001",
      name: "Step-Up Protected Operation",
      description: "Requires fresh biometrics",
      triggerType: "copilot",
      steps: [
        {
          id: "step_su_1",
          name: "Sensitive Record Mutation",
          tool: "leave.approveLeave",
          params: { leaveRequestId: "leave_404" },
          requiresHitl: true,
          requiresStepUpAuth: true,
        },
      ],
    };

    const result = await remediationRuntime.executePlan(plan, mockCtx);
    const gateId = result.stepResults[0].gateId!;

    // Stale auth (> 300s) should throw
    await expect(
      remediationRuntime.resumeGate(gateId, "approve", {
        ...mockCtx,
        stepUpFreshnessSeconds: 400, // Stale!
      })
    ).rejects.toThrow("D12 Step-Up authentication required");

    // Fresh auth (<= 300s) should succeed
    const freshRes = await remediationRuntime.resumeGate(gateId, "approve", {
      ...mockCtx,
      stepUpFreshnessSeconds: 150,
    });
    expect(freshRes.status).toBe("completed");
  });

  it("triggers Saga compensating rollback when a step fails", async () => {
    const plan: RemediationPlan = {
      id: "plan_rollback_001",
      name: "Failing Saga Plan",
      description: "Step 2 fails, Step 1 rolls back",
      triggerType: "copilot",
      steps: [
        {
          id: "step_rb_1",
          name: "Initial Step",
          tool: "notification.sendMulticast",
          params: { title: "Pre-alert" },
          compensatingAction: {
            tool: "notification.sendMulticast",
            params: { title: "Compensating rollback notice" },
          },
        },
        {
          id: "step_rb_2",
          name: "Failing Step",
          tool: "nonexistent.tool",
          params: {},
        },
      ],
    };

    const result = await remediationRuntime.executePlan(plan, mockCtx);
    expect(result.status).toBe("rolled_back");
    expect(result.stepResults[1].status).toBe("failed");
  });
});
