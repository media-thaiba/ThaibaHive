import { WorkflowEngine } from "../workflow-engine";

describe("Purchase Requests Multi-Stage Approval Integration", () => {
  it("initializes purchase requests with pending_hod status", () => {
    const initialStatus = WorkflowEngine.determineInitialStatus("purchase", 2000);
    expect(initialStatus).toBe("pending_hod");
  });

  it("advances purchase request through full multi-tier lifecycle", () => {
    const stage1 = WorkflowEngine.getNextStatus("pending_hod", "approve", "purchase", 2000);
    expect(stage1).toBe("pending_accounts");

    const stage2 = WorkflowEngine.getNextStatus("pending_accounts", "approve", "purchase", 2000);
    expect(stage2).toBe("pending_purchase");

    const stage3 = WorkflowEngine.getNextStatus("pending_purchase", "approve", "purchase", 2000);
    expect(stage3).toBe("approved");

    const stage4 = WorkflowEngine.getNextStatus("approved", "approve", "purchase", 2000);
    expect(stage4).toBe("ordered");

    const stage5 = WorkflowEngine.getNextStatus("ordered", "approve", "purchase", 2000);
    expect(stage5).toBe("received");
  });

  it("handles emergency route instant approval path", () => {
    const initialStatus = WorkflowEngine.determineInitialStatus("purchase", 5000, true);
    expect(initialStatus).toBe("pending_hod");
  });

  it("rejects purchase request when rejected", () => {
    const status = WorkflowEngine.getNextStatus("pending_hod", "reject", "purchase", 2000);
    expect(status).toBe("rejected");
  });
});
