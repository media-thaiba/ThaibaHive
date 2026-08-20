import { MicrogridEnergyDispatcher } from '@/lib/operations/energy/microgrid-energy-dispatcher';
import { MicrogridEnergyState } from '@/lib/operations/energy/energy-types';

describe('AIMS-006 — MicrogridEnergyDispatcher', () => {
  it('should optimize solar PV self-consumption and battery discharge during peak tariff hours', () => {
    const dispatcher = new MicrogridEnergyDispatcher();

    const peakState: MicrogridEnergyState = {
      campusId: 'campus_main',
      solarPvGenerationKw: 40.0,
      batteryStorageChargeKwh: 120.0,
      batteryMaxCapacityKwh: 150.0,
      batteryStateOfChargeRatio: 0.80,
      gridImportKw: 0,
      campusTotalDemandKw: 80.0,
      electricityTariffPerKwh: 0.22,
      isPeakTariffWindow: true,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const plan = dispatcher.calculateDispatchPlan(peakState);

    expect(plan.solarToCampusKw).toBe(40.0);
    // 80 kW demand - 40 kW solar = 40 kW remaining demand covered by battery discharge
    expect(plan.batteryDischargeKw).toBe(40.0);
    // Grid import reduced to 0 kW
    expect(plan.gridImportKw).toBe(0.0);
    expect(plan.estimatedCostDollarsPerHour).toBe(0.0);
  });
});
