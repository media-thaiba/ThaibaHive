/**
 * Multi-Factor Device Trust Scoring Engine
 * Sprint-041 (ZASM)
 */

import {
  DevicePostureTelemetry,
  DeviceTrustScore,
  TrustFactorBreakdown,
  TrustWeights,
} from './trust-types';
import { DEFAULT_TRUST_WEIGHTS, classifyTrustTier } from './trust-weights';

export class DeviceTrustEvaluator {
  private weights: TrustWeights;

  constructor(customWeights?: Partial<TrustWeights>) {
    this.weights = { ...DEFAULT_TRUST_WEIGHTS, ...customWeights };
  }

  /**
   * Evaluates the multi-factor trust score for a device based on posture telemetry
   */
  public evaluate(telemetry: DevicePostureTelemetry): DeviceTrustScore {
    const penalties: { reason: string; pointsDeducted: number }[] = [];

    // 1. OS and Patch Score (Max: weights.osAndPatchWeight, default 25)
    let osRatio = 1.0;
    if (telemetry.osType === 'unknown') {
      osRatio -= 0.4;
      penalties.push({ reason: 'Unknown OS type detected', pointsDeducted: 10 });
    }
    if (telemetry.patchLevelDaysOld > 90) {
      osRatio -= 0.6;
      penalties.push({ reason: `Outdated OS patch level (${telemetry.patchLevelDaysOld} days old)`, pointsDeducted: 15 });
    } else if (telemetry.patchLevelDaysOld > 30) {
      osRatio -= 0.3;
      penalties.push({ reason: `OS patch level > 30 days old (${telemetry.patchLevelDaysOld} days)`, pointsDeducted: 8 });
    }
    const osAndPatchScore = Math.max(0, Math.round(Math.max(0, osRatio) * this.weights.osAndPatchWeight));

    // 2. Endpoint Compliance (MDM, Disk Encryption, Firewall) (Max: weights.endpointComplianceWeight, default 20)
    let complianceRatio = 0.0;
    if (telemetry.mdmEnrolled) complianceRatio += 0.4;
    if (telemetry.diskEncrypted) complianceRatio += 0.3;
    if (telemetry.firewallEnabled) complianceRatio += 0.3;

    if (!telemetry.firewallEnabled) {
      penalties.push({ reason: 'Local firewall disabled', pointsDeducted: 6 });
    }
    if (!telemetry.diskEncrypted) {
      penalties.push({ reason: 'Device storage not encrypted', pointsDeducted: 6 });
    }
    const endpointComplianceScore = Math.round(complianceRatio * this.weights.endpointComplianceWeight);

    // 3. DPoP Cryptographic Binding (Max: weights.dpopBindingWeight, default 20)
    let dpopScore = 0;
    if (telemetry.dpopBound && telemetry.dpopJkt) {
      dpopScore = this.weights.dpopBindingWeight;
    } else {
      penalties.push({ reason: 'Missing DPoP cryptographic hardware key binding', pointsDeducted: 20 });
    }

    // 4. Authentication Strength (WebAuthn / Passkey / MFA) (Max: weights.authStrengthWeight, default 15)
    let authScore = 5; // Baseline password/token
    if (telemetry.webAuthnCapable) {
      authScore = this.weights.authStrengthWeight;
    }

    // 5. Network Location & Geo Risk (Max: weights.geoRiskWeight, default 10)
    let geoScore = this.weights.geoRiskWeight;
    if (telemetry.vpnOrProxyDetected) {
      geoScore = Math.max(0, geoScore - 5);
      penalties.push({ reason: 'Anonymizing VPN or commercial proxy detected', pointsDeducted: 5 });
    }

    // 6. Behavioral Stability (Max: weights.behavioralStabilityWeight, default 10)
    let behavioralScore = this.weights.behavioralStabilityWeight;
    if (telemetry.recentAuthFailures > 5) {
      behavioralScore = 0;
      penalties.push({ reason: `High authentication failure rate (${telemetry.recentAuthFailures} failures in 1h)`, pointsDeducted: 10 });
    } else if (telemetry.recentAuthFailures > 2) {
      behavioralScore = Math.max(0, behavioralScore - 5);
      penalties.push({ reason: `Elevated authentication failures (${telemetry.recentAuthFailures} in 1h)`, pointsDeducted: 5 });
    }

    const factorBreakdown: TrustFactorBreakdown = {
      osAndPatchScore,
      endpointComplianceScore,
      dpopBindingScore: dpopScore,
      authStrengthScore: authScore,
      geoRiskScore: geoScore,
      behavioralStabilityScore: behavioralScore,
    };

    const rawTotal =
      osAndPatchScore +
      endpointComplianceScore +
      dpopScore +
      authScore +
      geoScore +
      behavioralScore;

    const finalScore = Math.max(0, Math.min(100, rawTotal));
    const tier = classifyTrustTier(finalScore);

    return {
      deviceId: telemetry.deviceId,
      tenantId: telemetry.tenantId || 'global',
      score: finalScore,
      tier,
      factorBreakdown,
      penaltiesApplied: penalties,
      isOverridden: false,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
