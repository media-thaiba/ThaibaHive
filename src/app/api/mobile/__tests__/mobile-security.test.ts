import { verifySession, hasPermission } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(),
}));


describe("Mobile API RBAC & Security Audit Test Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should enforce authentication on unauthenticated requests", async () => {
    (verifySession as jest.Mock).mockResolvedValue(null);

    const { GET } = await import("@/app/api/mobile/v1/dashboard/route");
    const req = new Request("http://localhost:3000/api/mobile/v1/dashboard");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Not authenticated");
  });

  it("should enforce RBAC authorization for restricted routes", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "usr_staff_01",
      role: "staff",
      email: "staff@thaibahive.edu",
      employeeId: "EMP-01",
      name: "Staff User",
      tokenVersion: 1,
    });
    (hasPermission as jest.Mock).mockReturnValue(false);

    const { requireAuth } = await import("@/lib/api/auth-guard");
    const dummyHandler = jest.fn();
    const wrapped = requireAuth(dummyHandler, "admin:manage");

    const req = new Request("http://localhost:3000/api/mobile/v1/admin");
    const res = await wrapped(req);

    expect(res.status).toBe(403);
    expect(dummyHandler).not.toHaveBeenCalled();
  });

  it("should verify session role and staff identifier isolation", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "usr_p_01",
      role: "principal",
      email: "principal@thaibahive.edu",
      employeeId: "EMP-001",
      name: "Principal User",
      tokenVersion: 1,
    });

    const session = await verifySession();
    expect(session?.staffId).toBe("usr_p_01");
    expect(session?.role).toBe("principal");
  });
});
