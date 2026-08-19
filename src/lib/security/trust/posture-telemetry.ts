/**
 * Device Posture Telemetry Ingester
 * Sprint-041 (ZASM)
 */

import { DevicePostureTelemetry } from './trust-types';

export class PostureTelemetryIngester {
  private static recentTelemetry: Map<string, DevicePostureTelemetry> = new Map();

  /**
   * Ingests and sanitizes device posture telemetry payload
   */
  public static ingest(payload: Partial<DevicePostureTelemetry> & { deviceId: string }): DevicePostureTelemetry {
    if (!payload.deviceId || !payload.deviceId.trim()) {
      throw new Error('deviceId is required for posture telemetry');
    }

    const telemetry: DevicePostureTelemetry = {
      deviceId: payload.deviceId,
      tenantId: payload.tenantId || 'global',
      osType: payload.osType || 'unknown',
      osVersion: payload.osVersion || 'unknown',
      patchLevelDaysOld: typeof payload.patchLevelDaysOld === 'number' ? payload.patchLevelDaysOld : 0,
      mdmEnrolled: Boolean(payload.mdmEnrolled),
      diskEncrypted: Boolean(payload.diskEncrypted),
      firewallEnabled: payload.firewallEnabled !== undefined ? Boolean(payload.firewallEnabled) : true,
      dpopBound: Boolean(payload.dpopBound),
      dpopJkt: payload.dpopJkt,
      webAuthnCapable: Boolean(payload.webAuthnCapable),
      lastKnownIp: payload.lastKnownIp || '127.0.0.1',
      geoCountry: payload.geoCountry,
      geoCity: payload.geoCity,
      vpnOrProxyDetected: Boolean(payload.vpnOrProxyDetected),
      recentAuthFailures: typeof payload.recentAuthFailures === 'number' ? payload.recentAuthFailures : 0,
      userAgent: payload.userAgent || 'unknown',
      collectedAt: new Date().toISOString(),
    };

    this.recentTelemetry.set(telemetry.deviceId, telemetry);
    return telemetry;
  }

  /**
   * Retrieves latest stored telemetry for a device
   */
  public static getLatestTelemetry(deviceId: string): DevicePostureTelemetry | undefined {
    return this.recentTelemetry.get(deviceId);
  }

  /**
   * Clears telemetry cache
   */
  public static clear(): void {
    this.recentTelemetry.clear();
  }
}
