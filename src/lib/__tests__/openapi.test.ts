import { GET } from "@/app/api/openapi.json/route";
import { verifySession, hasPermission } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn(),
  hasPermission: jest.fn(),
}));

describe("OpenAPI 3.1 Specification Route", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    (process.env as Record<string, string>).NODE_ENV = originalEnv;
  });

  test("should return valid OpenAPI 3.1 JSON spec in development mode", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    const response = await GET();
    expect(response.status).toBe(200);

    const spec = await response.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBeDefined();
    expect(spec.info.version).toBeDefined();
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(Array.isArray(spec.tags)).toBe(true);
  });

  test("should enforce production security gating and reject unauthenticated requests", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    (verifySession as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  test("should enforce production security gating and reject authenticated non-admin staff requests", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "staff-123",
      role: "staff",
    });
    (hasPermission as jest.Mock).mockReturnValue(false);

    const response = await GET();
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("Forbidden");
    expect(hasPermission).toHaveBeenCalledWith("staff", "admin:all");
  });

  test("should allow authenticated admin requests in production mode", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: "admin-123",
      role: "admin",
    });
    (hasPermission as jest.Mock).mockReturnValue(true);

    const response = await GET();
    expect(response.status).toBe(200);

    const spec = await response.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(hasPermission).toHaveBeenCalledWith("admin", "admin:all");
  });

  test("should include required security schemes and path endpoints in spec", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    const response = await GET();
    const spec = await response.json();

    expect(spec.components.securitySchemes.CookieAuth).toBeDefined();
    expect(spec.components.securitySchemes.BearerAuth).toBeDefined();

    expect(spec.paths["/api/auth/login"]).toBeDefined();
    expect(spec.paths["/api/auth/me"]).toBeDefined();
    expect(spec.paths["/api/staff"]).toBeDefined();
    expect(spec.paths["/api/attendance/check-in"]).toBeDefined();
    expect(spec.paths["/api/leaves"]).toBeDefined();
    expect(spec.paths["/api/reviews"]).toBeDefined();
    expect(spec.paths["/api/marketplace/apps"]).toBeDefined();
    expect(spec.paths["/api/system/health"]).toBeDefined();
    expect(spec.paths["/api/notifications/subscribe"]).toBeDefined();
  });
});
