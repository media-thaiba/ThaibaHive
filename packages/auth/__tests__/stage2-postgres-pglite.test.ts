import { describe, it, expect } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";

describe("Stage 2 Postgres Verification via PGlite & wrapPgDb", () => {
  it("executes Stage 2 Postgres/PGlite verification harness successfully", () => {
    const runnerPath = path.resolve(__dirname, "stage2-pglite-runner.ts");
    const output = execSync(`npx tsx "${runnerPath}"`, {
      encoding: "utf-8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "stage2-test-auth-jwt-secret-at-least-32-chars-long",
      },
    });

    expect(output).toContain("PASS Test 1: Atomic role change, tokenVersion bump, and session termination on Postgres");
    expect(output).toContain("PASS Test 2: Step-up token replay on Postgres caught and identified by isStepUpReplayError (code 23505)");
    expect(output).toContain("PASS Test 3: Subordinate rank hierarchy and system role immunity verified on Postgres");
    expect(output).toContain("=== All Stage 2 Postgres/PGlite verification tests passed! ===");
  });
});
