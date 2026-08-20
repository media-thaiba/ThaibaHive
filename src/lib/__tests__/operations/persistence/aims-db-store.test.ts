import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';

describe('AIMS-018 — AimsDbStore', () => {
  it('should perform type-safe CRUD operations across all AIMS entities', () => {
    const store = AimsDbStore.getInstance();
    store.clear();

    // Agent
    store.saveAgent({
      agentId: 'hvac_master',
      domain: 'hvac_energy',
      policyState: { epsilon: 0.05 },
      institutionId: 'inst_001',
    });
    expect(store.getAgent('hvac_master')?.domain).toBe('hvac_energy');

    // Vehicle
    store.saveVehicle({
      vehicleId: 'bus_01',
      campusId: 'campus_main',
      vehicleType: 'SHUTTLE_BUS',
      speedKmph: 22,
    });
    expect(store.getVehicle('bus_01')?.speedKmph).toBe(22);

    // Carbon Metric
    store.saveCarbonMetric({
      id: 'metric_01',
      campusId: 'campus_main',
      reportingPeriod: '2026-Q3',
      totalKg: 4500,
    });
    expect(store.getCarbonMetrics('campus_main').length).toBe(1);
  });
});
