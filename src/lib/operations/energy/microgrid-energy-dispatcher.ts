import { MicrogridEnergyState } from './energy-types';

export interface DispatchPlan {
  campusId: string;
  solarToCampusKw: number;
  solarToBatteryKw: number;
  batteryDischargeKw: number;
  gridImportKw: number;
  curtailmentRecommendationKw: number;
  estimatedCostDollarsPerHour: number;
  timestamp: string;
}

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

    let solarToCampus = Math.min(demand, solar);
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
    const estimatedCost = gridImport * state.electricityTariffPerKwh;

    return {
      campusId: state.campusId,
      solarToCampusKw: Number(solarToCampus.toFixed(2)),
      solarToBatteryKw: Number(solarToBattery.toFixed(2)),
      batteryDischargeKw: Number(batteryDischarge.toFixed(2)),
      gridImportKw: Number(gridImport.toFixed(2)),
      curtailmentRecommendationKw: Number((remainingDemand * 0.1).toFixed(2)),
      estimatedCostDollarsPerHour: Number(estimatedCost.toFixed(2)),
      timestamp: new Date().toISOString(),
    };
  }
}
