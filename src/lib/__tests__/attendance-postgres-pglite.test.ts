import { describe, it, expect } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";

describe("Version 1.0 Attendance Event-Sourcing on Real PostgreSQL 16 (PGlite)", () => {
  it("executes complete attendance append-only ledger and concurrent projections on real PostgreSQL engine", () => {
    const runnerPath = path.resolve(__dirname, "../attendance/attendance-postgres-runner.ts");
    const output = execSync(`npx tsx "${runnerPath}"`, {
      encoding: "utf-8",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    expect(output).toContain("All PostgreSQL 16 / PGlite Attendance Event-Sourcing Verifications Passed!");
  }, 30000);
});
