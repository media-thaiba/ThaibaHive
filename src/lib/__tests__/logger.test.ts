import { logger } from "@/lib/logger";

describe("Structured Logger (src/lib/logger.ts)", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs info messages with metadata in development mode", () => {
    logger.info("Test info message", { user: "test@example.com" });
    expect(logSpy).toHaveBeenCalled();
  });

  it("redacts sensitive fields like passwords and tokens", () => {
    const originalLogFormat = process.env.LOG_FORMAT;
    process.env.LOG_FORMAT = "json";

    try {
      logger.info("User login attempt", {
        email: "user@example.com",
        password: "SuperSecretPassword123",
        token: "jwt.token.string",
      });

      expect(logSpy).toHaveBeenCalled();
      const rawOutput = logSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawOutput);

      expect(parsed.data.password).toBe("[REDACTED]");
      expect(parsed.data.token).toBe("[REDACTED]");
      expect(parsed.data.email).toBe("user@example.com");
    } finally {
      process.env.LOG_FORMAT = originalLogFormat;
    }
  });

  it("handles circular references gracefully without throwing", () => {
    const originalLogFormat = process.env.LOG_FORMAT;
    process.env.LOG_FORMAT = "json";

    try {
      const circularObj: Record<string, unknown> = { name: "test" };
      circularObj.self = circularObj;

      expect(() => logger.error("Circular test", circularObj)).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();

      const rawOutput = errorSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawOutput);
      expect(parsed.data.self).toBe("[Circular]");
    } finally {
      process.env.LOG_FORMAT = originalLogFormat;
    }
  });

  it("serializes Error objects with stack traces in production JSON mode", () => {
    const originalLogFormat = process.env.LOG_FORMAT;
    process.env.LOG_FORMAT = "json";

    try {
      const testErr = new Error("Database connection failed");
      logger.error("DB error occurred", testErr);

      expect(errorSpy).toHaveBeenCalled();
      const rawOutput = errorSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawOutput);

      expect(parsed.data.name).toBe("Error");
      expect(parsed.data.message).toBe("Database connection failed");
      expect(parsed.data.stack).toBeDefined();
    } finally {
      process.env.LOG_FORMAT = originalLogFormat;
    }
  });
});
