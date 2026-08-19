/**
 * Rollback Verifier Unit Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

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

  it("should evaluate DR canary promotion gate correctly", () => {
    const evaluation = evaluateDRExecution();

    expect(evaluation.passed).toBe(true);
    expect(evaluation.rpoPassed).toBe(true);
    expect(evaluation.mttrPassed).toBe(true);
    expect(evaluation.parityPassed).toBe(true);
    expect(evaluation.details.length).toBeGreaterThan(0);
  });
});
