import { ThermalDegradationResult } from '../predictive-types';
import { AnomalySeverity } from '../../facility-types';

export class ThermalDegradationModel {
  /**
   * Evaluates Chiller / Heat Exchanger thermal performance:
   * COP = Thermal Heat Removed (kW_th) / Electrical Power Consumed (kW_el)
   * Expected COP for modern water-cooled chiller: 5.0 - 6.5
   * Expected delta T (Chilled Water Supply vs Return): 5.0°C - 6.5°C
   */
  public static evaluate(
    equipmentId: string,
    chilledWaterSupplyTempC: number,
    chilledWaterReturnTempC: number,
    flowRateLps: number, // Liters per second
    electricalPowerKw: number,
    baselineCop: number = 5.8
  ): ThermalDegradationResult {
    const deltaT = Number((chilledWaterReturnTempC - chilledWaterSupplyTempC).toFixed(2));

    // Thermal cooling capacity (kW) = Q = m * Cp * deltaT (for water: Cp = 4.184 kJ/kg.K)
    const massFlowKgSec = flowRateLps; // approx 1 kg/L
    const coolingCapacityKw = massFlowKgSec * 4.184 * Math.max(0, deltaT);

    // Calculated COP (Coefficient of Performance)
    const copEstimate = electricalPowerKw > 0
      ? Number((coolingCapacityKw / electricalPowerKw).toFixed(2))
      : baselineCop;

    // Heat exchange efficiency compared to baseline
    const heatExchangeEfficiencyPercent = Number(
      Math.min(100, Math.max(0, (copEstimate / baselineCop) * 100)).toFixed(1)
    );

    let foulingDetected = false;
    let refrigerantLeakSuspected = false;
    let severity: AnomalySeverity = 'low';
    let recommendedAction = 'Thermal parameters within normal operational envelope';

    if (heatExchangeEfficiencyPercent < 50 || deltaT < 1.5) {
      severity = 'critical';
      refrigerantLeakSuspected = true;
      recommendedAction = 'Emergency inspection: severe loss of cooling capacity indicates refrigerant loss or compressor failure';
    } else if (heatExchangeEfficiencyPercent < 80) {
      severity = 'high';
      foulingDetected = true;
      recommendedAction = 'Schedule condenser tube descaling & chemical water treatment (fouling detected)';
    } else if (heatExchangeEfficiencyPercent < 90) {
      severity = 'medium';
      recommendedAction = 'Monitor thermal approach temperature curve over next 48 hours';
    }

    return {
      equipmentId,
      heatExchangeEfficiencyPercent,
      temperatureDelta: deltaT,
      copEstimate,
      severity,
      foulingDetected,
      refrigerantLeakSuspected,
      recommendedAction,
    };
  }
}
