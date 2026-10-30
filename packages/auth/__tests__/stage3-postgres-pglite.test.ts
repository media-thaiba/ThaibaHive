import { describe, it, expect } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";

describe("Stage 3 Postgres Verification via PGlite & wrapPgDb", () => {
  it("executes Stage 3 Postgres/PGlite verification harness successfully", () => {
    const runnerPath = path.resolve(__dirname, "stage3-pglite-runner.ts");
    const output = execSync(`npx tsx "${runnerPath}"`, {
      encoding: "utf-8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || "stage3-test-auth-jwt-secret-at-least-32-chars-long",
      },
    });

    expect(output).toContain("PASS Test 1: Sequential hash-chaining, Merkle root, and inclusion proofs on Postgres");
    expect(output).toContain("PASS Test 2: Database-level trigger on Postgres rejects UPDATE and DELETE with 'Audit ledger is immutable'");
    expect(output).toContain("PASS Test 3: Transaction rollback atomicity on Postgres verified cleanly (no sequence leak)");
    expect(output).toContain("=== All Stage 3 Postgres/PGlite verification tests passed! ===");
  });
});
