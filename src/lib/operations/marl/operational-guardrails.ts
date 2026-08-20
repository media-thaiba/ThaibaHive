import { AgentAction } from './marl-types';

export interface GuardrailLimits {
  minTempCelsius: number; // e.g. 20.0 C
  maxTempCelsius: number; // e.g. 26.0 C
  maxContinuousDriverHours: number; // e.g. 4.0 hours
  minCloudCpuReserveRatio: number; // e.g. 0.30 (30% floor)
  maxOperationalCostDeltaDollars: number; // e.g. 500 dollars
}

export interface GuardrailCheckResult {
  passed: boolean;
  violations: string[];
  clampedParameters: Record<string, any>;
  requiresHumanApproval: boolean;
}

/**
 * Operational Guardrails Module (AIMS / AutoOps)
 * Intercepts all autonomous agent proposals and enforces physical safety invariants.
 */
export class OperationalGuardrails {
  private limits: GuardrailLimits;

  constructor(customLimits?: Partial<GuardrailLimits>) {
    this.limits = {
      minTempCelsius: 20.0,
      maxTempCelsius: 26.0,
      maxContinuousDriverHours: 4.0,
      minCloudCpuReserveRatio: 0.30,
      maxOperationalCostDeltaDollars: 500,
      ...customLimits,
    };
  }

  /**
   * Evaluates an agent action proposal against configured safety invariants
   */
  public evaluateAction(action: AgentAction, currentContext?: Record<string, any>): GuardrailCheckResult {
    const violations: string[] = [];
    const clampedParams: Record<string, any> = { ...action.parameters };
    let requiresApproval = false;

    if (action.domain === 'hvac_energy') {
      const currentTemp = currentContext?.currentTempCelsius ?? 23.0;
      const setpointAdj = action.parameters?.setpointAdjustment ?? 0;
      const targetTemp = currentTemp + setpointAdj;

      if (targetTemp < this.limits.minTempCelsius) {
        violations.push(`Target temperature ${targetTemp.toFixed(1)}°C is below safety floor of ${this.limits.minTempCelsius}°C`);
        clampedParams.setpointAdjustment = Number((this.limits.minTempCelsius - currentTemp).toFixed(2));
      } else if (targetTemp > this.limits.maxTempCelsius) {
        violations.push(`Target temperature ${targetTemp.toFixed(1)}°C is above safety ceiling of ${this.limits.maxTempCelsius}°C`);
        clampedParams.setpointAdjustment = Number((this.limits.maxTempCelsius - currentTemp).toFixed(2));
      }
    } else if (action.domain === 'fleet_logistics') {
      const shiftHours = action.parameters?.continuousShiftHours ?? 0;
      if (shiftHours > this.limits.maxContinuousDriverHours) {
        violations.push(`Driver shift duration ${shiftHours}h exceeds continuous limit of ${this.limits.maxContinuousDriverHours}h`);
        requiresApproval = true;
      }
    } else if (action.domain === 'cloud_cost') {
      const reserveRatio = action.parameters?.cpuReserveRatio ?? 0.5;
      if (reserveRatio < this.limits.minCloudCpuReserveRatio) {
        violations.push(`Cloud compute reserve ratio ${(reserveRatio * 100).toFixed(0)}% is below safe threshold ${(this.limits.minCloudCpuReserveRatio * 100).toFixed(0)}%`);
        clampedParams.cpuReserveRatio = this.limits.minCloudCpuReserveRatio;
        requiresApproval = true;
      }
    }

    const estimatedCost = action.parameters?.estimatedCostDeltaDollars ?? 0;
    if (Math.abs(estimatedCost) > this.limits.maxOperationalCostDeltaDollars) {
      requiresApproval = true;
    }

    return {
      passed: violations.length === 0,
      violations,
      clampedParameters: clampedParams,
      requiresHumanApproval: requiresApproval,
    };
  }

  public getLimits(): GuardrailLimits {
    return { ...this.limits };
  }
}
