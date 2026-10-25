import { describe, it, expect } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";

describe("Stage Hostel ERP: PostgreSQL Dialect Parity Suite via PGlite", () => {
  it("executes complete hostel bed allocation, CAS gate pass reissue, and fine ledger verification on real PostgreSQL engine", () => {
    const runnerPath = path.resolve(__dirname, "hostel-pglite-runner.ts");
    const output = execSync(`npx tsx "${runnerPath}"`, {
      encoding: "utf-8",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    expect(output).toContain("All PostgreSQL / PGlite TPSH Hostel ERP Verifications Passed!");
  }, 30000);
});
