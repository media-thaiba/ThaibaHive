jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn().mockResolvedValue({
    userId: "user-admin-1",
    staffId: "staff-admin-1",
    email: "admin@example.com",
    role: "super_admin",
  }),
  hasPermission: jest.fn().mockReturnValue(true),
}));

import { GET as getTasks } from "@/app/api/tasks/route";
import { GET as getAccounts } from "@/app/api/accounts/route";
import { GET as getExpenseClaims } from "@/app/api/expense-claims/route";

describe("List Endpoint Pagination (Task P1-18)", () => {
  it("returns paginated response for GET /api/tasks", async () => {
    const req = new Request("http://localhost/api/tasks?page=1&limit=5");
    const res = await getTasks(req as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("tasks");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page", 1);
    expect(body).toHaveProperty("limit", 5);
  });

  it("returns paginated response for GET /api/accounts", async () => {
    const req = new Request("http://localhost/api/accounts?page=1&limit=10");
    const res = await getAccounts(req as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("transactions");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page", 1);
    expect(body).toHaveProperty("limit", 10);
  });

  it("returns paginated response for GET /api/expense-claims", async () => {
    const req = new Request("http://localhost/api/expense-claims?page=1&limit=5");
    const res = await getExpenseClaims(req as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty("claims");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page", 1);
    expect(body).toHaveProperty("limit", 5);
  });
});
