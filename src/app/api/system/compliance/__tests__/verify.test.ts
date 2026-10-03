import { POST, GET } from "../verify/route";

jest.mock("@/lib/auth/require-auth", () => ({
  requireAuth: (fn: any) => fn,
}));

jest.mock("@/db", () => {
  return {
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    },
  };
});

describe("/api/system/compliance/verify", () => {
  it("returns 200 and verification results for valid query", async () => {
    const req = new Request("http://localhost:3000/api/system/compliance/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: "default", limit: 100 }),
    });

    const res = await POST(req, { role: "admin" });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.valid).toBe(true);
    expect(json.status).toBe("VALID");
    expect(json.totalVerified).toBe(0);
  });
});
