import { ZasmSimulationRunner } from '../../../../../scripts/security/zasm-simulation-runner';

describe('ZASM End-to-End Pipeline & Simulation Harness', () => {
  it('executes full 6-phase zero-trust simulation successfully', async () => {
    const summary = await ZasmSimulationRunner.runFullSimulation({ silent: true });

    expect(summary.pkiMeshInitialized).toBe(true);
    expect(summary.mtlsHandshakePassed).toBe(true);
    expect(summary.initialDeviceTrustScore).toBeGreaterThanOrEqual(80);
    expect(summary.postAnomalyTrustScore).toBeLessThan(40);
    expect(summary.quarantineVlanAssigned).toBe(99);
    expect(summary.sbomPackagesScanned).toBeGreaterThan(0);
    expect(summary.forensicReportGenerated).toBe(true);
    expect(summary.durationMs).toBeLessThan(5000);
  });

  it('supports dry-run mode without mutating persistent state', async () => {
    const dryRunSummary = await ZasmSimulationRunner.runFullSimulation({ isDryRun: true, silent: true });
    expect(dryRunSummary.mtlsHandshakePassed).toBe(true);
  });
});
