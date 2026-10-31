import { GET } from "../route";
import { db } from "@/db";

let mockIsPostgres = false;

jest.mock("@/db", () => {
  return {
    get isPostgres() {
      return mockIsPostgres;
    },
    db: {
      run: jest.fn(),
      execute: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(),
    },
    sql: (strings: TemplateStringsArray) => strings[0],
  };
});

jest.mock("@/lib/observability/sliding-window-aggregator", () => ({
  SlidingWindowAggregator: {
    getInstance: () => ({
      recordRequest: jest.fn(),
    }),
  },
}));

// Mock redis
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue("PONG"),
  disconnect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

jest.mock("redis", () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe("Readiness Health Check Route (GET /api/system/health/ready)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPostgres = false;
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
    delete process.env.HEALTH_SECRET;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Database Gating & Dialect Branching", () => {
    test("SQLite dialect: executes SELECT 1 via run/execute without SET LOCAL, returns 200 when healthy", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);

      const req = new Request("http://localhost:3000/api/system/health/ready");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.timestamp).toBeDefined();
      expect(json.checks).toBeUndefined(); // minimal redaction for unauthorized
      expect(db.run).toHaveBeenCalledWith("SELECT 1");
      expect(db.transaction).not.toHaveBeenCalled();
    });

    test("PostgreSQL dialect: wraps check in transaction with SET LOCAL statement_timeout = 2500", async () => {
      mockIsPostgres = true;
      const mockTx = {
        execute: jest.fn().mockResolvedValue(undefined),
      };
      (db.transaction as jest.Mock).mockImplementationOnce(async (cb) => {
        return await cb(mockTx);
      });

      const req = new Request("http://localhost:3000/api/system/health/ready");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(db.transaction).toHaveBeenCalled();
      expect(mockTx.execute).toHaveBeenNthCalledWith(1, "SET LOCAL statement_timeout = 2500");
      expect(mockTx.execute).toHaveBeenNthCalledWith(2, "SELECT 1");
    });

    test("Database failure returns 503 Service Unavailable and unhealthy status", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockRejectedValueOnce(
        new Error("Failed query: SELECT 1 FROM non_existent\nparams: [secret_token_123]")
      );

      process.env.HEALTH_SECRET = "supersecret123";
      const req = new Request("http://localhost:3000/api/system/health/ready", {
        headers: { "x-health-secret": "supersecret123" },
      });
      const res = await GET(req);

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.status).toBe("unhealthy");
      expect(json.checks.database.healthy).toBe(false);
      // Sanitizer must have stripped the raw query and params
      expect(json.checks.database.error).not.toContain("secret_token_123");
      expect(json.checks.database.error).toContain("params: [REDACTED]");
    });
  });

  describe("Redis Non-Gating Behavior", () => {
    test("Redis absent (REDIS_URL unset) reports status not_configured and does not degrade 200 readiness", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);
      delete process.env.REDIS_URL;

      process.env.HEALTH_SECRET = "supersecret123";
      const req = new Request("http://localhost:3000/api/system/health/ready", {
        headers: { "x-health-secret": "supersecret123" },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.checks.redis.status).toBe("not_configured");
      expect(json.checks.redis.healthy).toBe(true);
    });

    test("Redis configured but failing is non-gating: readiness remains 200 OK while reporting redis failure", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);
      process.env.REDIS_URL = "redis://redis.cluster.internal:6379";

      mockRedisClient.connect.mockRejectedValueOnce(new Error("ECONNREFUSED 10.0.0.1:6379 password: my_raw_password"));

      process.env.HEALTH_SECRET = "supersecret123";
      const req = new Request("http://localhost:3000/api/system/health/ready", {
        headers: { "x-health-secret": "supersecret123" },
      });
      const res = await GET(req);

      // Crucial: Redis is non-gating, DB is healthy => 200 OK
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.checks.redis.healthy).toBe(false);
      expect(json.checks.redis.status).toBe("failed");
      expect(json.checks.redis.error).toBeDefined();
    });
  });

  describe("FCM Non-Gating Credentials Check", () => {
    test("FCM reports not_configured when FIREBASE_* env variables are missing", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);

      process.env.HEALTH_SECRET = "supersecret123";
      const req = new Request("http://localhost:3000/api/system/health/ready", {
        headers: { "x-health-secret": "supersecret123" },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.checks.fcm.status).toBe("not_configured");
      expect(json.checks.fcm.healthy).toBe(true);
    });

    test("FCM reports configured when FIREBASE credentials are fully present", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);
      process.env.FIREBASE_PROJECT_ID = "thaiba-cloud";
      process.env.FIREBASE_CLIENT_EMAIL = "fcm@thaiba.iam.gserviceaccount.com";
      process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----";

      process.env.HEALTH_SECRET = "supersecret123";
      const req = new Request("http://localhost:3000/api/system/health/ready", {
        headers: { "x-health-secret": "supersecret123" },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.checks.fcm.status).toBe("configured");
      expect(json.checks.fcm.healthy).toBe(true);
    });
  });

  describe("Authentication & Redaction Boundary", () => {
    test("Unauthenticated requests receive only status and timestamp", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);
      process.env.HEALTH_SECRET = "supersecret123";

      const req = new Request("http://localhost:3000/api/system/health/ready");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Object.keys(json).sort()).toEqual(["status", "timestamp"].sort());
      expect(json.checks).toBeUndefined();
      expect(json.uptimeSeconds).toBeUndefined();
    });

    test("Invalid x-health-secret receives unauthenticated minimal response", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);
      process.env.HEALTH_SECRET = "supersecret123";

      const req = new Request("http://localhost:3000/api/system/health/ready", {
        headers: { "x-health-secret": "wrongsecret" },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.checks).toBeUndefined();
    });

    test("TimingSafeEqual authorized request receives diagnostics and checks object", async () => {
      mockIsPostgres = false;
      (db.run as jest.Mock).mockResolvedValueOnce(undefined);
      process.env.HEALTH_SECRET = "supersecret123";

      const req = new Request("http://localhost:3000/api/system/health/ready", {
        headers: { "x-health-secret": "supersecret123" },
      });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.checks).toBeDefined();
      expect(json.checks.database).toBeDefined();
      expect(json.checks.redis).toBeDefined();
      expect(json.checks.fcm).toBeDefined();
      expect(json.uptimeSeconds).toBeDefined();
      expect(json.version).toBeDefined();
    });
  });
});
