import { POST } from "@/app/api/auth/login/route";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue("mocked-jwt-token"),
  })),
}));

jest.mock("@/db", () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue(null),
        }),
      }),
    }),
  },
}));

describe("Login Rate Limiting", () => {
  const originalEnv = process.env.ENABLE_RATE_LIMIT;

  beforeAll(() => {
    process.env.ENABLE_RATE_LIMIT = "true";
  });

  afterAll(() => {
    process.env.ENABLE_RATE_LIMIT = originalEnv;
  });

  it("blocks login requests exceeding 5 attempts per minute", async () => {
    const testIp = "192.168.1.99";
    const requestBody = JSON.stringify({
      email: "test.ratelimit@example.com",
      password: "wrongpassword123",
    });

    const makeRequest = () =>
      POST(
        new Request("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": testIp,
          },
          body: requestBody,
        })
      );

    // Make 5 requests (allowed limit)
    for (let i = 0; i < 5; i++) {
      const res = await makeRequest();
      expect(res.status).not.toBe(429);
    }

    // 6th request should be rate limited with HTTP 429
    const blockedRes = await makeRequest();
    expect(blockedRes.status).toBe(429);

    const json = await blockedRes.json();
    expect(json.error).toMatch(/Rate limit exceeded/);
    expect(blockedRes.headers.get("Retry-After")).toBeDefined();
  });
});
