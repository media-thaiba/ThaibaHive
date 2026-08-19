/**
 * Attack Simulation Runner Tests
 * Sprint-038 / AGS-011
 */

import { runSimulationHarness } from "../../../../scripts/security/run-attack-simulation";

describe("Attack Simulation Harness (AGS-011)", () => {
  it("should execute DDoS burst and IP quarantine scenarios successfully", async () => {
    const report = await runSimulationHarness();
    expect(report.overallStatus).toBe("PASSED");
    expect(report.scenarios.length).toBe(2);
    expect(report.scenarios[0].blockedRequests).toBeGreaterThan(0);
    expect(report.scenarios[1].quarantinedIps).toBe(1);
  });
});
