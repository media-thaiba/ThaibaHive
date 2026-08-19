/**
 * Device Trust Scoring & Behavioral Telemetry Type Definitions
 * Sprint-041 (ZASM)
 */

export type TrustTier = 'HIGH_TRUST' | 'MEDIUM_TRUST' | 'LOW_TRUST' | 'UNTRUSTED';

export interface DevicePostureTelemetry {
  deviceId: string;
  tenantId?: string;
  osType: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';
  osVersion: string;
  patchLevelDaysOld: number;
  mdmEnrolled: boolean;
  diskEncrypted: boolean;
  firewallEnabled: boolean;
  dpopBound: boolean;
  dpopJkt?: string;
  webAuthnCapable: boolean;
  lastKnownIp: string;
  geoCountry?: string;
  geoCity?: string;
  vpnOrProxyDetected: boolean;
  recentAuthFailures: number; // in last 1 hour
  userAgent: string;
  collectedAt: string; // ISO string
}

export interface TrustFactorBreakdown {
  osAndPatchScore: number;       // 0-25
  endpointComplianceScore: number; // 0-20
  dpopBindingScore: number;      // 0-20
  authStrengthScore: number;     // 0-15
  geoRiskScore: number;          // 0-10
  behavioralStabilityScore: number; // 0-10
}

export interface DeviceTrustScore {
  deviceId: string;
  tenantId: string;
  score: number; // 0 - 100
  tier: TrustTier;
  factorBreakdown: TrustFactorBreakdown;
  penaltiesApplied: { reason: string; pointsDeducted: number }[];
  isOverridden: boolean;
  overrideReason?: string;
  evaluatedAt: string; // ISO string
}

export interface TrustWeights {
  osAndPatchWeight: number;       // default 25
  endpointComplianceWeight: number; // default 20
  dpopBindingWeight: number;      // default 20
  authStrengthWeight: number;     // default 15
  geoRiskWeight: number;          // default 10
  behavioralStabilityWeight: number; // default 10
}

export interface TrustOverride {
  deviceId: string;
  tenantId: string;
  forcedScore: number;
  forcedTier: TrustTier;
  reason: string;
  appliedBy: string;
  expiresAt: string;
  createdAt: string;
}
