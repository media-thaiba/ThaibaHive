jest.mock("@/lib/api/auth-guard", () => ({
  requireAuth: (handler: any) => (req: any, session: any) => handler(req, session),
}));

jest.mock("@/db/index", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    all: jest.fn().mockResolvedValue([]),
    limit: jest.fn().mockReturnThis(),
  },
}));

import { GET } from "../route";

describe("Export API Route Handler (EXP-009)", () => {
  it("should return 400 for missing or invalid export type", async () => {
    const req = new Request("http://localhost:3000/api/export?type=invalid_type");
    const mockSession = { role: "admin", staffId: "staff_123" };

    const res = await (GET as any)(req, mockSession);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid type");
  });

  it("should return 400 for invalid format parameter", async () => {
    const req = new Request("http://localhost:3000/api/export?type=staff&format=unknown");
    const mockSession = { role: "admin", staffId: "staff_123" };

    const res = await (GET as any)(req, mockSession);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid format");
  });
});
