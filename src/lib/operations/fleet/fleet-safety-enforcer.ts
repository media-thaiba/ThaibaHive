import { VehicleTelemetry } from './fleet-types';

export interface SafetyViolation {
  vehicleId: string;
  violationType: 'SPEEDING' | 'HARSH_BRAKING' | 'DRIVER_FATIGUE' | 'LOW_TIRE_PRESSURE';
  severity: 'WARNING' | 'CRITICAL';
  description: string;
  detectedAt: string;
}

/**
 * Campus Fleet Safety Constraint Enforcer
 * Enforces pedestrian zone speed limits, driver shift boundaries, and vehicle operating parameters.
 */
export class FleetSafetyEnforcer {
  private speedLimitPedestrianKmph = 25.0;
  private maxContinuousDutyHours = 4.0;

  public evaluateTelemetry(telemetry: VehicleTelemetry, continuousDutyHours = 0): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

    // 1. Speed limit check
    if (telemetry.speedKmph > this.speedLimitPedestrianKmph) {
      violations.push({
        vehicleId: telemetry.vehicleId,
        violationType: 'SPEEDING',
        severity: telemetry.speedKmph > 35 ? 'CRITICAL' : 'WARNING',
        description: `Speed ${telemetry.speedKmph.toFixed(1)} km/h exceeds campus pedestrian limit of ${this.speedLimitPedestrianKmph} km/h`,
        detectedAt: new Date().toISOString(),
      });
    }

    // 2. Driver shift check
    if (continuousDutyHours > this.maxContinuousDutyHours) {
      violations.push({
        vehicleId: telemetry.vehicleId,
        violationType: 'DRIVER_FATIGUE',
        severity: 'CRITICAL',
        description: `Driver duty time ${continuousDutyHours.toFixed(1)}h exceeds mandatory rest threshold of ${this.maxContinuousDutyHours}h`,
        detectedAt: new Date().toISOString(),
      });
    }

    // 3. Tire pressure check
    if (telemetry.tirePressurePsi < 26) {
      violations.push({
        vehicleId: telemetry.vehicleId,
        violationType: 'LOW_TIRE_PRESSURE',
        severity: 'WARNING',
        description: `Tire pressure ${telemetry.tirePressurePsi} PSI is dangerously low`,
        detectedAt: new Date().toISOString(),
      });
    }

    return violations;
  }
}
