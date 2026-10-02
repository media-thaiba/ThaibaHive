import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runRollbackVerification } from "../rollback-verifier";
import { evaluateDRExecution } from "../../staging/dr-canary-evaluator";

describe("runRollbackVerification & evaluateDRExecution", () => {
  it("should return valid rollback verification report in dry run", async () => {
    const report = await runRollbackVerification(true);

    expect(report.status).toBe("VERIFIED");
    expect(report.parityResults.schemaAligned).toBe(true);
    expect(report.parityResults.rowCountsMatched).toBe(true);
    expect(report.parityResults.checksumMatched).toBe(true);
  });

  it("should return valid rollback verification report in live mode", async () => {
    const report = await runRollbackVerification(false);

    expect(report.status).toBe("VERIFIED");
    expect(report.steps.every((s) => s.passed)).toBe(true);
  });

  it("should evaluate DR canary promotion gate correctly", async () => {
    const report = await runRollbackVerification(false);
    const tempReportPath = path.join(os.tmpdir(), `rollback-test-${Date.now()}.json`);
    fs.writeFileSync(tempReportPath, JSON.stringify(report), "utf8");

    const evaluation = evaluateDRExecution(undefined, undefined, tempReportPath);

    try {
      fs.unlinkSync(tempReportPath);
    } catch {}

    expect(evaluation.passed).toBe(true);
    expect(evaluation.rpoPassed).toBe(true);
    expect(evaluation.mttrPassed).toBe(true);
    expect(evaluation.parityPassed).toBe(true);
    expect(evaluation.details.length).toBeGreaterThan(0);
  });
});
