import { VehicleHealthAssessment, VehicleTelemetry } from './fleet-types';

/**
 * Vehicle Predictive Maintenance Analytics Engine
 */
export class PredictiveMaintenanceEngine {
  /**
   * Computes component health and flags urgent service requirements
   */
  public evaluateVehicleHealth(telemetry: VehicleTelemetry): VehicleHealthAssessment {
    // 1. Powertrain score (based on engine temperature & odometer)
    let powertrainScore = 100;
    if (telemetry.engineTempCelsius > 105) {
      powertrainScore -= 40;
    } else if (telemetry.engineTempCelsius > 95) {
      powertrainScore -= 15;
    }
    if (telemetry.odometerKm > 100000) {
      powertrainScore -= 15;
    }

    // 2. Braking score (based on brake pad wear %)
    const brakingScore = Math.max(0, 100 - telemetry.brakePadWearPercent);

    // 3. Battery / Electrical score (based on SoC & health)
    let batteryScore = 95;
    if (telemetry.batterySoCRatio < 0.15) {
      batteryScore -= 20;
    }

    // 4. Tire score (based on pressure variance around 32-35 PSI)
    let tireScore = 100;
    const psiDiff = Math.abs(telemetry.tirePressurePsi - 33);
    if (psiDiff > 8) {
      tireScore -= 35;
    } else if (psiDiff > 4) {
      tireScore -= 15;
    }

    const compositeScore = Math.round(
      0.35 * powertrainScore + 0.30 * brakingScore + 0.20 * batteryScore + 0.15 * tireScore
    );

    // Failure probability curve over next 14 days factoring critical subsystem degradation
    let failureProb = (100 - compositeScore) / 100;
    if (telemetry.brakePadWearPercent > 80 || telemetry.engineTempCelsius > 105) {
      failureProb = Math.max(failureProb, 0.45);
    }
    failureProb = Math.min(1.0, Math.max(0.01, failureProb));
    const urgent = compositeScore < 60 || telemetry.brakePadWearPercent > 80;

    let recommendation: string | undefined;
    if (telemetry.brakePadWearPercent > 80) {
      recommendation = 'Urgent: Replace front/rear brake pads immediately';
    } else if (telemetry.engineTempCelsius > 100) {
      recommendation = 'Inspect radiator coolant level and thermal thermostat';
    } else if (compositeScore < 70) {
      recommendation = 'Schedule routine 10,000 km general service inspection';
    }

    return {
      vehicleId: telemetry.vehicleId,
      compositeHealthScore: compositeScore,
      failureProbabilityNext14Days: Number(failureProb.toFixed(3)),
      urgentMaintenanceRequired: urgent,
      subsystemScores: {
        powertrain: Math.max(0, powertrainScore),
        braking: Math.max(0, brakingScore),
        batteryElectrical: Math.max(0, batteryScore),
        tires: Math.max(0, tireScore),
      },
      recommendedServiceAction: recommendation,
      assessedAt: new Date().toISOString(),
    };
  }
}
