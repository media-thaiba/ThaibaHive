import { AnomalyDetectionResult } from './predictive-types';
import { RulEstimator } from './rul-estimator';
import { FacilityAnomalyAlertItem } from '../facility-types';
import { facilityStore } from '../../../db/facility-store';

export class AnomalyAlertManager {
  private static instance: AnomalyAlertManager;
  // Suppression window cache: key -> timestamp of last created alert
  private recentAlertCache: Map<string, number> = new Map();
  private suppressionWindowMs: number = 15 * 60 * 1000; // 15 minutes

  public static getInstance(): AnomalyAlertManager {
    if (!AnomalyAlertManager.instance) {
      AnomalyAlertManager.instance = new AnomalyAlertManager();
    }
    return AnomalyAlertManager.instance;
  }

  public clearCache(): void {
    this.recentAlertCache.clear();
  }

  public async processAnomaly(
    anomaly: AnomalyDetectionResult,
    operatingHours: number = 5000,
    institutionId: string = 'global'
  ): Promise<FacilityAnomalyAlertItem | null> {
    if (!anomaly.isAnomaly) return null;

    const cacheKey = `${institutionId}:${anomaly.equipmentId}:${anomaly.alertType}`;
    const now = Date.now();
    const lastTriggered = this.recentAlertCache.get(cacheKey);

    // Suppress spamming if alert was triggered recently
    if (lastTriggered && now - lastTriggered < this.suppressionWindowMs) {
      return null;
    }

    // Estimate RUL
    const rul = RulEstimator.estimateRul(anomaly.equipmentId, operatingHours, anomaly.anomalyScore);

    const alertId = `ALT_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const alert = await facilityStore.createAnomalyAlert({
      alertId,
      equipmentId: anomaly.equipmentId,
      sensorId: anomaly.sensorId,
      alertType: anomaly.alertType,
      severity: anomaly.severity,
      anomalyScore: anomaly.anomalyScore,
      predictedFailureMode: anomaly.reason,
      estimatedRulHours: rul.estimatedRulHours,
      rootCauseHypothesis: `Sensor ${anomaly.sensorId} recorded ${anomaly.currentValue} ${anomaly.sensorType} with anomaly score ${anomaly.anomalyScore}`,
      status: 'open',
      institutionId,
    });

    this.recentAlertCache.set(cacheKey, now);

    // Update equipment health score
    const healthScore = Math.max(0, 100 - anomaly.anomalyScore * 60);
    const equipStatus = anomaly.severity === 'critical' ? 'degraded' : 'operational';
    await facilityStore.updateEquipmentStatus(anomaly.equipmentId, equipStatus, healthScore, institutionId);

    return alert;
  }
}

export const anomalyAlertManager = AnomalyAlertManager.getInstance();
