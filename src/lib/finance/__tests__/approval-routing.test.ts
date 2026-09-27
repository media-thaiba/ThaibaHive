import { WorkflowEngine } from "../workflow-engine";

describe("Approval Routing Logic", () => {
  it("determines required approver role per pending status", () => {
    expect(WorkflowEngine.getRequiredApproverRole("pending_hod")).toBe("hod");
    expect(WorkflowEngine.getRequiredApproverRole("pending_accounts")).toBe("accounts");
    expect(WorkflowEngine.getRequiredApproverRole("pending_purchase")).toBe("purchase");
    expect(WorkflowEngine.getRequiredApproverRole("pending_principal")).toBe("principal");
    expect(WorkflowEngine.getRequiredApproverRole("disbursed")).toBeNull();
  });

  it("validates super_admin and admin can approve any pending stage", () => {
    expect(WorkflowEngine.canUserApprove("super_admin", "pending_hod")).toBe(true);
    expect(WorkflowEngine.canUserApprove("admin", "pending_principal")).toBe(true);
  });

  it("validates role-based boundary constraints", () => {
    expect(WorkflowEngine.canUserApprove("principal", "pending_principal")).toBe(true);
    expect(WorkflowEngine.canUserApprove("accounts", "pending_accounts")).toBe(true);
    expect(WorkflowEngine.canUserApprove("purchase", "pending_purchase")).toBe(true);
    expect(WorkflowEngine.canUserApprove("staff", "pending_hod")).toBe(false);
  });
});
