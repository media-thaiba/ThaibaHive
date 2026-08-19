jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn().mockResolvedValue({
    userId: "user-staff-1",
    staffId: "staff-1",
    email: "staff@example.com",
    role: "staff",
  }),
  hasPermission: jest.fn((role: string, permission: string) => {
    // Return true for marketplace permissions, false for attendance:read if testing mismatch
    if (permission.startsWith("marketplace:")) return true;
    return false;
  }),
}));

import { GET as getMarketplaceApps } from "@/app/api/marketplace/apps/route";
import { GET as getAccessRequests } from "@/app/api/marketplace/access-requests/route";
import { POST as installApp } from "@/app/api/marketplace/install/route";

describe("Marketplace Permission Scopes (Task P1-22)", () => {
  it("allows access to GET /api/marketplace/apps with marketplace:install permission", async () => {
    const req = new Request("http://localhost/api/marketplace/apps");
    const res = await getMarketplaceApps(req as any, {} as any);
    expect(res.status).toBe(200);
  });

  it("allows access to GET /api/marketplace/access-requests with marketplace:install permission", async () => {
    const req = new Request("http://localhost/api/marketplace/access-requests");
    const res = await getAccessRequests(req as any, {} as any);
    expect(res.status).toBe(200);
  });

  it("requires marketplace:install permission on POST /api/marketplace/install", async () => {
    const req = new Request("http://localhost/api/marketplace/install", {
      method: "POST",
      body: JSON.stringify({ appId: "non-existent-app" }),
    });
    const res = await installApp(req as any, {} as any);
    // Should pass RBAC guard (returning 404 since app isn't found) rather than 403 Forbidden
    expect(res.status).not.toBe(403);
  });
});
