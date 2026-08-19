import { WorkflowEngine } from "../workflow-engine";

describe("WorkflowEngine State Machine", () => {
  it("auto-approves expense claims under $500", () => {
    const status = WorkflowEngine.determineInitialStatus("expense", 450);
    expect(status).toBe("approved");
  });

  it("routes expense claims between $500 and $5,000 to pending_hod", () => {
    const status = WorkflowEngine.determineInitialStatus("expense", 2500);
    expect(status).toBe("pending_hod");
  });

  it("routes expense claims over $5,000 to pending_hod initially", () => {
    const status = WorkflowEngine.determineInitialStatus("expense", 10000);
    expect(status).toBe("pending_hod");
  });

  it("advances $2,500 expense claim from pending_hod to approved upon HOD approval", () => {
    const nextStatus = WorkflowEngine.getNextStatus(
      "pending_hod",
      "approve",
      "expense",
      2500
    );
    expect(nextStatus).toBe("approved");
  });

  it("advances $10,000 expense claim from pending_hod to pending_accounts to pending_principal to approved", () => {
    let nextStatus = WorkflowEngine.getNextStatus(
      "pending_hod",
      "approve",
      "expense",
      10000
    );
    expect(nextStatus).toBe("pending_accounts");

    nextStatus = WorkflowEngine.getNextStatus(
      "pending_accounts",
      "approve",
      "expense",
      10000
    );
    expect(nextStatus).toBe("pending_principal");

    nextStatus = WorkflowEngine.getNextStatus(
      "pending_principal",
      "approve",
      "expense",
      10000
    );
    expect(nextStatus).toBe("approved");
  });

  it("sets status to rejected when rejected", () => {
    const nextStatus = WorkflowEngine.getNextStatus(
      "pending_hod",
      "reject",
      "expense",
      1000
    );
    expect(nextStatus).toBe("rejected");
  });

  it("enforces role permissions during transition validation", () => {
    const hodCheck = WorkflowEngine.validateTransition("pending_hod", "approve", "hod");
    expect(hodCheck.valid).toBe(true);

    const staffCheck = WorkflowEngine.validateTransition("pending_hod", "approve", "staff");
    expect(staffCheck.valid).toBe(false);
    expect(staffCheck.error).toContain("not authorized");
  });
});
