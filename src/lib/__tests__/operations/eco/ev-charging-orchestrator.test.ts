import { EvChargingOrchestrator } from '../../../operations/eco/ev/ev-charging-orchestrator';
import { OcppGatewayAdapter } from '../../../operations/eco/ev/ocpp-gateway-adapter';
import { EcoDbStore } from '../../../db/eco-store';

describe('EvChargingOrchestrator & OcppGatewayAdapter Unit Tests', () => {
  let orchestrator: EvChargingOrchestrator;
  let store: EcoDbStore;

  beforeEach(() => {
    store = EcoDbStore.getInstance();
    store.clearMemoryStore();
    orchestrator = new EvChargingOrchestrator(store);
    orchestrator.clearSessions();
  });

  it('should parse and extract OCPP 1.6/2.0 MeterValues correctly', () => {
    const rawCall = JSON.stringify([
      2,
      'msg_001',
      'MeterValues',
      {
        connectorId: 1,
        transactionId: 104,
        meterValue: [
          {
            timestamp: '2026-08-21T08:30:00.000Z',
            sampledValue: [
              { value: '45000', unit: 'W', measurand: 'Power.Active.Import' },
              { value: '18500', unit: 'Wh', measurand: 'Energy.Active.Import.Register' },
              { value: '72', unit: 'Percent', measurand: 'SoC' },
              { value: '400.5', unit: 'V', measurand: 'Voltage' },
            ],
          },
        ],
      },
    ]);

    const frame = OcppGatewayAdapter.parseRawMessage(rawCall);
    expect(frame).not.toBeNull();
    expect(frame?.action).toBe('MeterValues');

    const extracted = OcppGatewayAdapter.extractMeterValues(frame?.payload);
    expect(extracted.powerKw).toBe(45);
    expect(extracted.energyKwh).toBe(18.5);
    expect(extracted.socPercent).toBe(72);
    expect(extracted.voltageV).toBe(400.5);
  });

  it('should manage charging sessions and dynamically shed load by priority', async () => {
    await orchestrator.startSession({
      sessionId: 'ses_bus_01',
      stationId: 'evs_01',
      vehicleId: 'bus_campus_01',
      vehicleType: 'bus',
      currentSoC: 40,
      targetSoC: 90,
      allocatedPowerKw: 50,
      isV2GActive: false,
      energyDeliveredKwh: 0,
      energyDischargedKwh: 0,
    });

    await orchestrator.startSession({
      sessionId: 'ses_commuter_01',
      stationId: 'evs_02',
      vehicleId: 'car_staff_01',
      vehicleType: 'staff_commuter',
      currentSoC: 60,
      targetSoC: 80,
      allocatedPowerKw: 22,
      isV2GActive: false,
      energyDeliveredKwh: 0,
      energyDischargedKwh: 0,
    });

    // Case 1: Ample grid capacity (80 kW available)
    const fullAllocations = orchestrator.computeLoadAllocations(80);
    expect(fullAllocations).toHaveLength(2);
    expect(fullAllocations.find((a) => a.stationId === 'evs_01')?.allocatedPowerKw).toBe(50); // Bus gets 50 kW
    expect(fullAllocations.find((a) => a.stationId === 'evs_02')?.allocatedPowerKw).toBe(22); // Car gets 22 kW

    // Case 2: Constrained grid capacity during campus peak (55 kW total budget)
    // Bus priority keeps 50 kW, car gets throttled to remaining 5 kW
    const throttledAllocations = orchestrator.computeLoadAllocations(55);
    expect(throttledAllocations.find((a) => a.stationId === 'evs_01')?.allocatedPowerKw).toBe(50);
    expect(throttledAllocations.find((a) => a.stationId === 'evs_02')?.isThrottled).toBe(true);
  });
});
