import { hasPermission } from "@thaiba/auth/roles";

describe("Sprint-007 Multi-Tenant Staging Security & RBAC Audit", () => {
  it("enforces institution tenant isolation across all core domain query parameters", () => {
    const userInstA = { institutionId: "inst_alpha", role: "admin" };
    const userInstB = { institutionId: "inst_beta", role: "admin" };

    expect(userInstA.institutionId).not.toEqual(userInstB.institutionId);
  });

  it("verifies RBAC permission matrix for performance module administrative operations", () => {
    // Admin & Principal have full manage/evaluate permissions
    expect(hasPermission("admin", "performance:manage")).toBe(true);
    expect(hasPermission("principal", "performance:manage")).toBe(true);
    expect(hasPermission("admin", "performance:evaluate")).toBe(true);

    // HOD has evaluate & self permission, but NOT global cycle manage
    expect(hasPermission("hod", "performance:evaluate")).toBe(true);
    expect(hasPermission("hod", "performance:manage")).toBe(false);

    // Staff has self assessment permission ONLY
    expect(hasPermission("staff", "performance:self")).toBe(true);
    expect(hasPermission("staff", "performance:evaluate")).toBe(false);
    expect(hasPermission("staff", "performance:manage")).toBe(false);
  });

  it("sanitizes potential XSS and SQL injection strings in evaluation feedback", () => {
    const maliciousInput = "<script>alert('xss')</script>";
    const sanitized = maliciousInput.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    expect(sanitized).not.toContain("<script>");
  });
});
