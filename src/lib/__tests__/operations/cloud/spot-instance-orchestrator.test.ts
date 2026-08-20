import { SpotInstanceOrchestrator } from '@/lib/operations/cloud/spot-instance-orchestrator';

describe('AIMS-013 — SpotInstanceOrchestrator', () => {
  it('should formulate hybrid spot allocation plan and handle interruption notices with zero downtime', () => {
    const orchestrator = new SpotInstanceOrchestrator();

    const plan = orchestrator.generateMigrationPlan('prod-batch-cluster', 10, 0.6, 200, 'inst_001');

    expect(plan.currentSpotCount).toBe(6);
    expect(plan.currentOnDemandCount).toBe(4);
    expect(plan.projectedAnnualSavingsDollars).toBeGreaterThan(5000);

    const interruptionRes = orchestrator.handleInterruptionNotice({
      instanceId: 'i-spot-1234',
      clusterName: 'prod-batch-cluster',
      noticeReceivedIso: new Date().toISOString(),
      timeToDrainSeconds: 120,
    });

    expect(interruptionRes.fallbackSpawned).toBe(true);
    expect(interruptionRes.drainedSuccessfully).toBe(true);
  });
});
