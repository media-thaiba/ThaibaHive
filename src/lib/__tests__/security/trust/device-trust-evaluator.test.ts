import { DeviceTrustEvaluator } from '@/lib/security/trust/device-trust-evaluator';
import { DevicePostureTelemetry } from '@/lib/security/trust/trust-types';

describe('DeviceTrustEvaluator', () => {
  let evaluator: DeviceTrustEvaluator;

  beforeEach(() => {
    evaluator = new DeviceTrustEvaluator();
  });

  it('evaluates a fully compliant, hardened enterprise device to HIGH_TRUST', () => {
    const telemetry: DevicePostureTelemetry = {
      deviceId: 'dev-corp-100',
      osType: 'macos',
      osVersion: '14.5.0',
      patchLevelDaysOld: 5,
      mdmEnrolled: true,
      diskEncrypted: true,
      firewallEnabled: true,
      dpopBound: true,
      dpopJkt: 'test-dpop-jkt-fingerprint-12345',
      webAuthnCapable: true,
      lastKnownIp: '192.168.1.50',
      vpnOrProxyDetected: false,
      recentAuthFailures: 0,
      userAgent: 'Mozilla/5.0 (Macintosh; Apple Silicon)',
      collectedAt: new Date().toISOString(),
    };

    const result = evaluator.evaluate(telemetry);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.tier).toBe('HIGH_TRUST');
    expect(result.penaltiesApplied).toHaveLength(0);
  });

  it('penalizes missing DPoP binding and outdated OS patch level to MEDIUM or LOW trust', () => {
    const telemetry: DevicePostureTelemetry = {
      deviceId: 'dev-outdated-200',
      osType: 'windows',
      osVersion: '10.0.19041',
      patchLevelDaysOld: 120, // > 90 days penalty
      mdmEnrolled: false,
      diskEncrypted: false,
      firewallEnabled: false,
      dpopBound: false, // missing DPoP
      webAuthnCapable: false,
      lastKnownIp: '203.0.113.10',
      vpnOrProxyDetected: true,
      recentAuthFailures: 6,
      userAgent: 'Mozilla/5.0',
      collectedAt: new Date().toISOString(),
    };

    const result = evaluator.evaluate(telemetry);
    expect(result.score).toBeLessThan(50);
    expect(result.tier === 'LOW_TRUST' || result.tier === 'UNTRUSTED').toBe(true);
    expect(result.penaltiesApplied.length).toBeGreaterThan(2);
  });
});
