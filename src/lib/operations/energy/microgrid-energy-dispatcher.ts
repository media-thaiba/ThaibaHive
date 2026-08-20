import { MicrogridEnergyState, DispatchPlan } from './energy-types';

/**
 * Campus Microgrid & Solar/Battery Energy Dispatcher
 * Optimizes power flow across Solar PV, Battery Storage (BESS), and Utility Grid.
 */
export class MicrogridEnergyDispatcher {
  /**
   * Generates real-time power dispatch schedule to minimize peak demand charges and maximize solar self-consumption
   */
  public calculateDispatchPlan(state: MicrogridEnergyState): DispatchPlan {
    const demand = state.campusTotalDemandKw;
    const solar = state.solarPvGenerationKw;
    const solarToCampus = Math.min(demand, solar);
    let remainingDemand = demand - solarToCampus;
    let remainingSolar = solar - solarToCampus;

    let solarToBattery = 0;
    if (remainingSolar > 0 && state.batteryStateOfChargeRatio < 0.95) {
      const maxChargePower = 50; // kW max charge rate
      solarToBattery = Math.min(remainingSolar, maxChargePower);
      remainingSolar -= solarToBattery;
    }

    let batteryDischarge = 0;
    // If peak tariff and remaining demand, discharge battery
    if (state.isPeakTariffWindow && remainingDemand > 0 && state.batteryStateOfChargeRatio > 0.20) {
      const maxDischargePower = 50; // kW
      batteryDischarge = Math.min(remainingDemand, maxDischargePower);
      remainingDemand -= batteryDischarge;
    }

    const gridImport = remainingDemand;

    return {
      timestamp: new Date().toISOString(),
      solarToCampusKw: Number(solarToCampus.toFixed(2)),
      solarToBatteryKw: Number(solarToBattery.toFixed(2)),
      batteryDischargeKw: Number(batteryDischarge.toFixed(2)),
      gridImportKw: Number(gridImport.toFixed(2)),
      gridExportKw: Number(remainingSolar.toFixed(2)),
      estimatedCostSavingsDollars: Number(((solarToCampus + batteryDischarge) * (state.electricityTariffPerKwh || 0.14)).toFixed(2)),
      estimatedCostDollarsPerHour: Number((gridImport * (state.electricityTariffPerKwh || 0.14)).toFixed(2)),
    };
  }
}
