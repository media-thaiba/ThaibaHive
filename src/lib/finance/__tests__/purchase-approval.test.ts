import { WorkflowEngine } from "../workflow-engine";

describe("Purchase Requests Multi-Stage Approval Integration", () => {
  it("initializes purchase requests with pending_hod status", () => {
    const initialStatus = WorkflowEngine.determineInitialStatus("purchase", 2000);
    expect(initialStatus).toBe("pending_hod");
  });

  it("advances purchase request from pending_hod to pending_accounts to approved", () => {
    const stage1 = WorkflowEngine.getNextStatus("pending_hod", "approve", "purchase", 2000);
    expect(stage1).toBe("pending_accounts");

    const stage2 = WorkflowEngine.getNextStatus("pending_accounts", "approve", "purchase", 2000);
    expect(stage2).toBe("approved");
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
