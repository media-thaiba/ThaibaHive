import { sanitizeErrorMessage, extractCleanStack } from "../sanitize";

describe("Sanitization Utility (src/lib/diagnostics/sanitize.ts)", () => {
  test("redacts both SQL query body and parameters in Drizzle query error", () => {
    const rawMsg = "Failed query: INSERT INTO users (email, token) VALUES ('secret_user@example.com', 'super_secret_jwt_token')\nparams: secret_user@example.com, super_secret_jwt_token";
    const cleaned = sanitizeErrorMessage(rawMsg);

    expect(cleaned).not.toContain("secret_user@example.com");
    expect(cleaned).not.toContain("super_secret_jwt_token");
    expect(cleaned).toContain("Failed query: [REDACTED]");
    expect(cleaned).toContain("params: [REDACTED]");
  });

  test("redacts VALUES clause in raw SQL queries", () => {
    const rawMsg = "syntax error at or near VALUES ('alice@school.edu', 'secret_hash')";
    const cleaned = sanitizeErrorMessage(rawMsg);

    expect(cleaned).not.toContain("alice@school.edu");
    expect(cleaned).not.toContain("secret_hash");
    expect(cleaned).toContain("values ([REDACTED])");
  });

  test("redacts multi-row VALUES clauses with gi flags and prevents email leak across multiple rows", () => {
    const rawMsg = "syntax error at or near VALUES ('a@x.com', 123), ('b@x.com', 456)";
    const cleaned = sanitizeErrorMessage(rawMsg);

    expect(cleaned).not.toContain("a@x.com");
    expect(cleaned).not.toContain("b@x.com");
    expect(cleaned).toContain("values ([REDACTED])");
  });

  test("truncates extremely long messages to 500 chars", () => {
    const longMsg = "A".repeat(600);
    const cleaned = sanitizeErrorMessage(longMsg);

    expect(cleaned.length).toBeLessThanOrEqual(520);
    expect(cleaned).toContain("[TRUNCATED]");
  });

  test("extractCleanStack discards Error message line and extracts pure V8 call frames", () => {
    const err = new Error("Leaked message with secret_user@example.com");
    err.stack = "Error: Leaked message with secret_user@example.com\n    at Object.test (D:\\app\\test.ts:10:5)\n    at process.run (D:\\app\\runner.ts:20:10)";

    const cleanStack = extractCleanStack(err);

    expect(cleanStack).toBeDefined();
    expect(cleanStack).not.toContain("secret_user@example.com");
    expect(cleanStack).not.toContain("Error:");
    expect(cleanStack).toMatch(/^at /);
  });

  test("extractCleanStack ignores multi-line message containing 'at ...' phrases", () => {
    const err = new Error("Validation failure:\n  at least one value is required\n  at risk of failure");
    err.stack = "Error: Validation failure:\n  at least one value is required\n  at risk of failure\n    at validateInput (D:\\app\\validator.ts:42:15)\n    at process.run (D:\\app\\runner.ts:20:10)";

    const cleanStack = extractCleanStack(err);

    expect(cleanStack).toBeDefined();
    expect(cleanStack).not.toContain("at least one value is required");
    expect(cleanStack).not.toContain("at risk of failure");
    expect(cleanStack).toBe("at validateInput (D:\\app\\validator.ts:42:15)\nat process.run (D:\\app\\runner.ts:20:10)");
  });
});
