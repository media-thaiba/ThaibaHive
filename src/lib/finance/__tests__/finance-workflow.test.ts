import { WorkflowEngine } from "../workflow-engine";

describe("Finance Workflow Engine Thorough Transitions", () => {
  it("rejects transition on completed or approved requests", () => {
    const res1 = WorkflowEngine.validateTransition("approved", "approve", "super_admin");
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain("terminal status");

    const res2 = WorkflowEngine.validateTransition("rejected", "approve", "super_admin");
    expect(res2.valid).toBe(false);
  });

  it("handles return action to status returned", () => {
    const nextStatus = WorkflowEngine.getNextStatus("pending_hod", "return", "expense", 1000);
    expect(nextStatus).toBe("returned");
  });

  it("returns current status for unrecognized or no-op actions", () => {
    const nextStatus = WorkflowEngine.getNextStatus("pending_hod", "approve" as any, "expense", 1000);
    expect(nextStatus).toBe("approved");
  });
});
