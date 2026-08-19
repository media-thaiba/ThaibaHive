import { ZasmSimulationRunner } from '../../../../../scripts/security/zasm-simulation-runner';

describe('ZasmSimulationRunner', () => {
  it('runs complete end-to-end Zero-Trust simulation pipeline', async () => {
    const summary = await ZasmSimulationRunner.runFullSimulation();

    expect(summary.pkiMeshInitialized).toBe(true);
    expect(summary.mtlsHandshakePassed).toBe(true);
    expect(summary.initialDeviceTrustScore).toBeGreaterThanOrEqual(80);
    expect(summary.postAnomalyTrustScore).toBeLessThan(60);
    expect(summary.quarantineVlanAssigned).toBe(99);
    expect(summary.sbomPackagesScanned).toBe(2);
    expect(summary.forensicReportGenerated).toBe(true);
    expect(summary.durationMs).toBeLessThan(5000);
  });
});
