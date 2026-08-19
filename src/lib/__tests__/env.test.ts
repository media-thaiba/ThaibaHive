import { validateEnv } from "@/lib/env";

describe("Runtime Env Var Validation (env.ts)", () => {
  it("uses development defaults when environment variables are omitted", () => {
    const parsed = validateEnv({
      NODE_ENV: "development",
    });

    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.DATABASE_URL).toBe("file:./dev.db");
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(parsed.AUTH_JWT_SECRET).toBe("dev-jwt-secret-min-32-chars-long-security-key-thaibahive");
  });

  it("parses valid custom environment variables successfully", () => {
    const parsed = validateEnv({
      NODE_ENV: "production",
      AUTH_JWT_SECRET: "super-secret-production-jwt-key-with-64-characters-of-randomness",
      DATABASE_URL: "postgres://user:pass@localhost:5432/thaibahive",
      NEXT_PUBLIC_APP_URL: "https://thaibahive.com",
    });

    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.DATABASE_URL).toBe("postgres://user:pass@localhost:5432/thaibahive");
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://thaibahive.com");
  });

  it("throws an error in production mode if AUTH_JWT_SECRET and JWT_SECRET are absent", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      validateEnv({
        NODE_ENV: "production",
      })
    ).toThrow("Missing production JWT secret.");

    consoleSpy.mockRestore();
  });
});
