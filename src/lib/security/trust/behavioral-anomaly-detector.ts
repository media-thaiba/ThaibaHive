/**
 * Behavioral Anomaly Detector
 * Sprint-041 (ZASM)
 */

import { DevicePostureTelemetry } from './trust-types';

export interface AnomalyReport {
  deviceId: string;
  anomaliesDetected: {
    type: 'IMPOSSIBLE_TRAVEL' | 'USER_AGENT_MUTATION' | 'AUTH_STORM' | 'GEO_VELOCITY_BREACH';
    description: string;
    riskScore: number;
  }[];
  totalPenaltyScore: number;
  detectedAt: string;
}

export interface GeoLocationSnapshot {
  ip: string;
  country: string;
  timestamp: number;
}

export class BehavioralAnomalyDetector {
  private static history: Map<string, GeoLocationSnapshot[]> = new Map();
  private static userAgentHistory: Map<string, string[]> = new Map();

  /**
   * Evaluates telemetry for behavioral anomalies
   */
  public static analyze(telemetry: DevicePostureTelemetry): AnomalyReport {
    const anomalies: AnomalyReport['anomaliesDetected'] = [];
    const now = Date.now();

    // 1. Check Geo-Velocity / Impossible Travel
    const deviceHistory = this.history.get(telemetry.deviceId) || [];
    if (telemetry.geoCountry && deviceHistory.length > 0) {
      const last = deviceHistory[deviceHistory.length - 1];
      const elapsedMinutes = (now - last.timestamp) / (1000 * 60);

      // If different country in less than 30 minutes -> Impossible Travel
      if (last.country !== telemetry.geoCountry && elapsedMinutes < 30) {
        anomalies.push({
          type: 'IMPOSSIBLE_TRAVEL',
          description: `Impossible travel: country switched from '${last.country}' to '${telemetry.geoCountry}' in ${Math.round(elapsedMinutes)} minutes`,
          riskScore: 35,
        });
      }
    }

    if (telemetry.geoCountry) {
      deviceHistory.push({
        ip: telemetry.lastKnownIp,
        country: telemetry.geoCountry,
        timestamp: now,
      });
      // Keep last 10
      if (deviceHistory.length > 10) deviceHistory.shift();
      this.history.set(telemetry.deviceId, deviceHistory);
    }

    // 2. Check User-Agent Mutation
    const uaList = this.userAgentHistory.get(telemetry.deviceId) || [];
    if (uaList.length > 0 && telemetry.userAgent !== 'unknown') {
      const lastUa = uaList[uaList.length - 1];
      if (lastUa !== telemetry.userAgent) {
        anomalies.push({
          type: 'USER_AGENT_MUTATION',
          description: 'Client User-Agent abruptly changed across concurrent requests',
          riskScore: 20,
        });
      }
    }

    if (telemetry.userAgent !== 'unknown') {
      uaList.push(telemetry.userAgent);
      if (uaList.length > 5) uaList.shift();
      this.userAgentHistory.set(telemetry.deviceId, uaList);
    }

    // 3. Check Authentication Storm
    if (telemetry.recentAuthFailures >= 5) {
      anomalies.push({
        type: 'AUTH_STORM',
        description: `Rapid auth failures (${telemetry.recentAuthFailures} in 1h) indicates credential stuffing or brute force`,
        riskScore: 25,
      });
    }

    const totalPenaltyScore = Math.min(50, anomalies.reduce((sum, a) => sum + a.riskScore, 0));

    return {
      deviceId: telemetry.deviceId,
      anomaliesDetected: anomalies,
      totalPenaltyScore,
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * Resets history for testing
   */
  public static clear(): void {
    this.history.clear();
    this.userAgentHistory.clear();
  }
}
