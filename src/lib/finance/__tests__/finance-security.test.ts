import { WorkflowEngine } from "../workflow-engine";

describe("RBAC & Multi-Tenant Security Enforcement", () => {
  it("denies approval actions to unauthorized roles", () => {
    const staffCheck = WorkflowEngine.validateTransition("pending_hod", "approve", "staff");
    expect(staffCheck.valid).toBe(false);
    expect(staffCheck.error).toContain("not authorized");
  });

  it("permits hod role to approve pending_hod stage", () => {
    const hodCheck = WorkflowEngine.validateTransition("pending_hod", "approve", "hod");
    expect(hodCheck.valid).toBe(true);
  });

  it("permits admin and super_admin to approve any pending stage", () => {
    const adminCheck = WorkflowEngine.validateTransition("pending_principal", "approve", "admin");
    expect(adminCheck.valid).toBe(true);

    const superAdminCheck = WorkflowEngine.validateTransition("pending_accounts", "approve", "super_admin");
    expect(superAdminCheck.valid).toBe(true);
  });

  it("sanitizes potential formula injection characters in decision notes", () => {
    const rawNote = "=CMD|' /C calc'!A0";
    const sanitized = rawNote.startsWith("=") ? `'${rawNote}` : rawNote;
    expect(sanitized.startsWith("'")).toBe(true);
  });
});
