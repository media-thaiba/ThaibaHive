import { requireAuth } from "../api/auth-guard";

jest.mock("@thaiba/auth", () => ({
  verifySession: jest.fn().mockResolvedValue(null),
  resolveInstitutionScopeForSession: jest.fn().mockResolvedValue("global"),
  hasPermission: jest.fn((role: string, perm: string) => {
    if (role === "super_admin") return true;
    if (role === "system") {
      const allowed = ["system:update", "media:reconcile", "cache:manage", "dr:manage"];
      return allowed.includes(perm);
    }
    return false;
  }),
}));

describe("SEC-03 Machine Secret Bypass Hardening", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CRON_SECRET: "test_cron_secret_123",
      CRON_SECRET_ROUTES: "/api/system/update,/api/media/reconcile",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should reject x-cron-secret on non-allowlisted routes (e.g. /api/students)", async () => {
    const handler = jest.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const wrapped = requireAuth(handler, "students:delete");

    const req = new Request("http://localhost:3000/api/students/123", {
      method: "DELETE",
      headers: { "x-cron-secret": "test_cron_secret_123" },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("should allow x-cron-secret on allowlisted path with system role", async () => {
    let capturedSession: any = null;
    const handler = jest.fn().mockImplementation(async (_req, session) => {
      capturedSession = session;
      return new Response(JSON.stringify({ ok: true }));
    });
    const wrapped = requireAuth(handler, "system:update");

    const req = new Request("http://localhost:3000/api/system/update", {
      method: "POST",
      headers: { "x-cron-secret": "test_cron_secret_123" },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(capturedSession).toBeDefined();
    expect(capturedSession.role).toBe("system");
    expect(capturedSession.staffId).toBe("system");
  });

  it("should block system role if route requires a non-system permission", async () => {
    const handler = jest.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const wrapped = requireAuth(handler, "finance:fees:delete");

    const req = new Request("http://localhost:3000/api/system/update", {
      method: "POST",
      headers: { "x-cron-secret": "test_cron_secret_123" },
    });

    const res = await wrapped(req);
    expect(res.status).toBe(403);
  });
});
