import { getPgPoolConfig } from "../index";

describe("PostgreSQL Connection Pool Sizing & Options", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DB_POOL_MAX;
    delete process.env.VERCEL;
    delete process.env.DB_SSL;
    delete process.env.DB_IDLE_TIMEOUT_MS;
    delete process.env.DB_CONNECTION_TIMEOUT_MS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should default to max=3 when VERCEL=1 is set", () => {
    process.env.VERCEL = "1";
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    const config = getPgPoolConfig("postgres://user:pass@ep-example.supabase.co:6543/postgres");
    expect(config.max).toBe(3);
  });

  it("should respect DB_POOL_MAX override", () => {
    process.env.DB_POOL_MAX = "5";
    process.env.VERCEL = "1";
    const config = getPgPoolConfig();
    expect(config.max).toBe(5);
  });

  it("should default to max=10 in standard production non-Vercel environment", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    delete process.env.VERCEL;
    const config = getPgPoolConfig("postgres://localhost:5432/test");
    expect(config.max).toBe(10);
  });

  it("should enable rejectUnauthorized:false for Supabase hosts", () => {
    const config = getPgPoolConfig("postgres://postgres.abcd:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres");
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("should disable ssl if DB_SSL is false", () => {
    process.env.DB_SSL = "false";
    const config = getPgPoolConfig("postgres://localhost:5432/test");
    expect(config.ssl).toBe(false);
  });

  it("should parse custom idle and connection timeout values", () => {
    process.env.DB_IDLE_TIMEOUT_MS = "15000";
    process.env.DB_CONNECTION_TIMEOUT_MS = "3000";
    const config = getPgPoolConfig();
    expect(config.idleTimeoutMillis).toBe(15000);
    expect(config.connectionTimeoutMillis).toBe(3000);
  });
});
