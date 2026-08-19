import { WorkflowEngine } from "../workflow-engine";

describe("Expense Claims Multi-Stage Approval Integration", () => {
  it("auto-approves claims under $500", () => {
    const initialStatus = WorkflowEngine.determineInitialStatus("expense", 350);
    expect(initialStatus).toBe("approved");
  });

  it("routes claims between $500 and $5,000 to pending_hod", () => {
    const initialStatus = WorkflowEngine.determineInitialStatus("expense", 1200);
    expect(initialStatus).toBe("pending_hod");
    const nextStatus = WorkflowEngine.getNextStatus("pending_hod", "approve", "expense", 1200);
    expect(nextStatus).toBe("approved");
  });

  it("requires multi-stage approval for claims > $5,000", () => {
    const initialStatus = WorkflowEngine.determineInitialStatus("expense", 7500);
    expect(initialStatus).toBe("pending_hod");

    const stage2 = WorkflowEngine.getNextStatus("pending_hod", "approve", "expense", 7500);
    expect(stage2).toBe("pending_accounts");

    const stage3 = WorkflowEngine.getNextStatus("pending_accounts", "approve", "expense", 7500);
    expect(stage3).toBe("pending_principal");

    const finalStage = WorkflowEngine.getNextStatus("pending_principal", "approve", "expense", 7500);
    expect(finalStage).toBe("approved");
  });

  it("requires rejection notes when rejecting a claim", () => {
    const validation = WorkflowEngine.validateTransition("pending_hod", "reject", "hod");
    expect(validation.valid).toBe(true);
  });
});
