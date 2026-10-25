import { describe, it, expect } from "@jest/globals";
import { execSync } from "child_process";
import path from "path";

describe("Stage 4 Postgres Health Diagnostics via PGlite & wrapPgDb", () => {
  it("executes Stage 4 Postgres/PGlite diagnostics verification harness successfully", () => {
    const runnerPath = path.resolve(__dirname, "stage4-pglite-runner.ts");
    const output = execSync(`npx tsx "${runnerPath}"`, {
      encoding: "utf-8",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    expect(output).toContain("=== All Stage 4 Postgres/PGlite diagnostics verification tests passed! ===");
  });
});
