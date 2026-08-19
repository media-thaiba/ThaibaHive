import { BehavioralAnomalyDetector } from '@/lib/security/trust/behavioral-anomaly-detector';
import { PostureTelemetryIngester } from '@/lib/security/trust/posture-telemetry';
import { DevicePostureTelemetry } from '@/lib/security/trust/trust-types';

describe('BehavioralAnomalyDetector & PostureTelemetryIngester', () => {
  beforeEach(() => {
    BehavioralAnomalyDetector.clear();
    PostureTelemetryIngester.clear();
  });

  it('ingests and sanitizes telemetry payload', () => {
    const telemetry = PostureTelemetryIngester.ingest({
      deviceId: 'dev-001',
      osType: 'linux',
      patchLevelDaysOld: 10,
    });

    expect(telemetry.deviceId).toBe('dev-001');
    expect(telemetry.firewallEnabled).toBe(true);
    expect(PostureTelemetryIngester.getLatestTelemetry('dev-001')).toBeDefined();
  });

  it('detects impossible travel anomalies when country switches rapidly', () => {
    const devId = 'dev-travel-01';

    // Step 1: Telemetry in London (GB)
    const tel1: DevicePostureTelemetry = {
      deviceId: devId,
      osType: 'windows',
      osVersion: '11',
      patchLevelDaysOld: 0,
      mdmEnrolled: true,
      diskEncrypted: true,
      firewallEnabled: true,
      dpopBound: true,
      webAuthnCapable: true,
      lastKnownIp: '81.2.69.142',
      geoCountry: 'GB',
      vpnOrProxyDetected: false,
      recentAuthFailures: 0,
      userAgent: 'Chrome/120',
      collectedAt: new Date().toISOString(),
    };
    const report1 = BehavioralAnomalyDetector.analyze(tel1);
    expect(report1.anomaliesDetected).toHaveLength(0);

    // Step 2: Immediate telemetry in Tokyo (JP)
    const tel2: DevicePostureTelemetry = {
      ...tel1,
      lastKnownIp: '133.242.1.1',
      geoCountry: 'JP',
    };
    const report2 = BehavioralAnomalyDetector.analyze(tel2);
    expect(report2.anomaliesDetected.some((a) => a.type === 'IMPOSSIBLE_TRAVEL')).toBe(true);
    expect(report2.totalPenaltyScore).toBeGreaterThanOrEqual(35);
  });

  it('detects auth storm anomalies during burst of failed logins', () => {
    const tel: DevicePostureTelemetry = {
      deviceId: 'dev-bruteforce',
      osType: 'linux',
      osVersion: '6.5',
      patchLevelDaysOld: 0,
      mdmEnrolled: false,
      diskEncrypted: false,
      firewallEnabled: true,
      dpopBound: false,
      webAuthnCapable: false,
      lastKnownIp: '1.2.3.4',
      vpnOrProxyDetected: true,
      recentAuthFailures: 10,
      userAgent: 'curl/7.68.0',
      collectedAt: new Date().toISOString(),
    };

    const report = BehavioralAnomalyDetector.analyze(tel);
    expect(report.anomaliesDetected.some((a) => a.type === 'AUTH_STORM')).toBe(true);
  });
});
