import { runAimsSimulation } from '../../../../scripts/operations/aims-simulation-runner';
import { MarlEngine } from '@/lib/operations/marl/marl-engine';

describe('AIMS-024 — End-to-End AIMS Operations Lifecycle & Latency Verification', () => {
  it('should execute single-step MARL joint coordination in < 10ms', () => {
    const engine = new MarlEngine();
    const startMarl = performance.now();
    const jointAction = engine.coordinateJointDecision({
      step: 1,
      observations: {
        agent_hvac: {
          agentId: 'agent_hvac',
          domain: 'hvac_energy',
          timestamp: new Date().toISOString(),
          stateVector: [22.5, 50, 450, 20],
          features: {},
          institutionId: 'inst_001',
          campusId: 'campus_main',
        },
      },
      globalStateVector: [0.1, 0.2, 0.3],
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    });
    const marlLatencyMs = performance.now() - startMarl;

    expect(jointAction.jointValueEstimate).toBeDefined();
    expect(marlLatencyMs).toBeLessThan(10.0); // Strict DoD < 10ms requirement
  });

  it('should execute full smart campus multi-agent simulation workflow with 100% success and sub-100ms step latency', async () => {
    const startTime = Date.now();
    const result = await runAimsSimulation(true);
    const totalLatency = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.marlStep.jointValueEstimate).toBeDefined();
    expect(result.hvacRes.optimizedSetpointCelsius).toBeGreaterThanOrEqual(18);
    expect(result.route.stops.length).toBe(2);
    expect(result.bioMatch.success).toBe(true);
    expect(result.bioMatch.latencyMs).toBeLessThan(100);
    expect(result.zkpRes.valid).toBe(true);
    expect(result.zkpRes.verificationLatencyMs).toBeLessThan(100);
    expect(result.cloudRec?.monthlySavingsDollars).toBeGreaterThan(0);
    expect(result.emissions.totalKgCo2e).toBeGreaterThan(0);
    expect(result.booking.success).toBe(true);
    expect(result.auditValid).toBe(true);

    // Assert total end-to-end multi-agent orchestration execution latency
    expect(totalLatency).toBeLessThan(5000);
  });
});
