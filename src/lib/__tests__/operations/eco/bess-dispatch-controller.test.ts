import { BessDispatchController } from '../../../operations/eco/ml/bess-dispatch-controller';
import { BatteryHealthModel, BatterySpecs } from '../../../operations/eco/ml/battery-health-model';

describe('BessDispatchController & BatteryHealthModel Unit Tests', () => {
  let specs: BatterySpecs;

  beforeEach(() => {
    specs = {
      batteryId: 'bess_unit_01',
      chemistry: 'lfp',
      nominalCapacityKwh: 500,
      maxContinuousPowerKw: 250,
      currentSoCPercent: 65,
      minAllowedSoCPercent: 20,
      maxAllowedSoCPercent: 90,
      emergencyReserveSoCPercent: 25,
      maxCRate: 0.5,
    };
  });

  it('should validate battery safety setpoint and clamp power if bounds breached', () => {
    // 1. Safe setpoint
    const safeRes = BatteryHealthModel.validateSetpoint(100, 65, specs);
    expect(safeRes.allowedPowerKw).toBe(100);
    expect(safeRes.isClamped).toBe(false);

    // 2. Power exceeding C-rate (0.5C on 500kWh = 250kW)
    const exceedRes = BatteryHealthModel.validateSetpoint(350, 65, specs);
    expect(exceedRes.allowedPowerKw).toBe(250);
    expect(exceedRes.isClamped).toBe(true);

    // 3. Discharging when at minimum SoC (20%)
    const lowSocRes = BatteryHealthModel.validateSetpoint(100, 20, specs);
    expect(lowSocRes.allowedPowerKw).toBe(0);
    expect(lowSocRes.isClamped).toBe(true);

    // 4. Charging when at max SoC (90%)
    const highSocRes = BatteryHealthModel.validateSetpoint(-100, 90, specs);
    expect(highSocRes.allowedPowerKw).toBe(0);
    expect(highSocRes.isClamped).toBe(true);
  });

  it('should compute degradation cost accurately', () => {
    const cost = BatteryHealthModel.calculateDegradationCost(500, specs);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(50); // Marginal degradation cost is minimal (~$15)
  });

  it('should generate real-time dispatch decisions across arbitrage, peak shaving, and emergency reserve modes', () => {
    const controller = new BessDispatchController(specs);

    // Arbitrage mode during peak hour (16:00) with net load deficit
    const decisionArbitrage = controller.computeRealTimeDispatch(20, 180, 16);
    expect(decisionArbitrage.mode).toBe('arbitrage');
    expect(decisionArbitrage.actualSetPointKw).toBeGreaterThan(0); // Discharging

    // Switch to Emergency Reserve mode
    specs.currentSoCPercent = 15; // Below reserve
    controller.setMode('emergency_reserve');
    const decisionReserve = controller.computeRealTimeDispatch(0, 100, 12);
    expect(decisionReserve.mode).toBe('emergency_reserve');
    expect(decisionReserve.actualSetPointKw).toBeLessThan(0); // Charging to secure reserve

    // Switch to Peak Shaving mode
    specs.currentSoCPercent = 70;
    controller.setMode('peak_shaving');
    const decisionPeak = controller.computeRealTimeDispatch(10, 220, 11);
    expect(decisionPeak.actualSetPointKw).toBeGreaterThan(0);
  });

  it('should generate a full 24-hour dispatch schedule', () => {
    const controller = new BessDispatchController(specs);
    const hourlyLoad = [30, 30, 30, 30, 40, 60, 100, 150, 180, 200, 210, 220, 210, 200, 220, 230, 210, 180, 140, 100, 70, 50, 40, 30];
    const hourlySolar = [0, 0, 0, 0, 0, 0, 10, 50, 100, 150, 190, 200, 195, 170, 130, 80, 30, 5, 0, 0, 0, 0, 0, 0];

    const schedule = controller.generate24hSchedule(hourlyLoad, hourlySolar);
    expect(schedule).toHaveLength(24);
    expect(schedule[15].dispatchAction).toBe('discharge'); // Peak hour 15:00
  });
});
