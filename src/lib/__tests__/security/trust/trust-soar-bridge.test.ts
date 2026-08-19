import { TrustSoarBridge } from '@/lib/security/trust/trust-soar-bridge';
import { DeviceTrustScore } from '@/lib/security/trust/trust-types';

describe('TrustSoarBridge', () => {
  beforeEach(() => {
    TrustSoarBridge.resetInstance();
  });

  it('triggers mitigation and SOAR playbook when trust drops below threshold (< 50)', async () => {
    const bridge = TrustSoarBridge.getInstance();

    const lowScore: DeviceTrustScore = {
      deviceId: 'compromised-laptop-01',
      tenantId: 'tenant-main',
      score: 25,
      tier: 'LOW_TRUST',
      factorBreakdown: {
        osAndPatchScore: 5,
        endpointComplianceScore: 0,
        dpopBindingScore: 0,
        authStrengthScore: 5,
        geoRiskScore: 5,
        behavioralStabilityScore: 0,
      },
      penaltiesApplied: [{ reason: 'Missing DPoP', pointsDeducted: 20 }],
      isOverridden: false,
      evaluatedAt: new Date().toISOString(),
    };

    const result = await bridge.handleTrustScoreChange(lowScore, 85);
    expect(result).not.toBeNull();
    expect(result?.deviceId).toBe('compromised-laptop-01');
    expect(result?.newScore).toBe(25);
    expect(bridge.getMitigationHistory().length).toBeGreaterThan(0);
  });

  it('does not trigger mitigation when trust score is healthy (>= 50)', async () => {
    const bridge = TrustSoarBridge.getInstance();

    const healthyScore: DeviceTrustScore = {
      deviceId: 'healthy-macbook-02',
      tenantId: 'tenant-main',
      score: 90,
      tier: 'HIGH_TRUST',
      factorBreakdown: {
        osAndPatchScore: 25,
        endpointComplianceScore: 20,
        dpopBindingScore: 20,
        authStrengthScore: 15,
        geoRiskScore: 10,
        behavioralStabilityScore: 10,
      },
      penaltiesApplied: [],
      isOverridden: false,
      evaluatedAt: new Date().toISOString(),
    };

    const result = await bridge.handleTrustScoreChange(healthyScore, 90);
    expect(result).toBeNull();
  });
});
