import { describe, it, expect } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";

describe("Stage 1 Postgres Verification via PGlite & wrapPgDb", () => {
  it("executes Stage 1 Postgres/PGlite verification harness successfully", () => {
    const runnerPath = path.resolve(__dirname, "stage1-pglite-runner.ts");
    const output = execSync(`npx tsx "${runnerPath}"`, {
      encoding: "utf-8",
      env: { ...process.env, NODE_ENV: "test" },
    });

    expect(output).toContain("PASS Test 1: Session inserted and retrieved through wrapPgDb on Postgres");
    expect(output).toContain("PASS Test 2: Idempotent session termination with .returning() on Postgres");
    expect(output).toContain("PASS Test 3: Duplicate jti correctly rejected with Postgres unique violation (replay detected)");
    expect(output).toContain("=== All Stage 1 Postgres/PGlite verification tests passed! ===");
  });
});
