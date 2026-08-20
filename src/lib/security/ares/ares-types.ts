/**
 * Autonomous Resilience & Predictive Security Engine (ARES)
 * Core Type Definitions — Sprint-042
 */

export type ThreatCategory =
  | 'CREDENTIAL_STUFFING'
  | 'ZERO_DAY_EXPLOIT'
  | 'LATERAL_MOVEMENT'
  | 'DATA_EXFILTRATION'
  | 'SUPPLY_CHAIN_POISONING'
  | 'DISTRIBUTED_DENIAL_OF_SERVICE'
  | 'RANSOMWARE_IMPACT'
  | 'PRIVILEGE_ESCALATION';

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export type AlertSeverityTier = 'CRITICAL_FORECAST' | 'HIGH_FORECAST' | 'ELEVATED_RISK' | 'MONITOR';

export interface ThreatSignalEvidence {
  signalId: string;
  source: string;
  signalType: string;
  weight: number; // 0.0 to 1.0
  observedValue: number; // 0.0 to 1.0
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PredictiveThreatForecast {
  forecastId: string;
  threatCategory: ThreatCategory;
  posteriorProbability: number; // 0.0 to 1.0
  confidenceScore: number; // 0 to 100
  severityTier: AlertSeverityTier;
  projectedExploitWindowDays: number; // 7, 14, etc.
  keyIndicators: string[];
  affectedAssetIds: string[];
  recommendedMitigations: string[];
  calculatedAt: string;
}

export interface PreemptiveHardeningAction {
  actionId: string;
  threatCategory: ThreatCategory;
  actionType:
    | 'TIGHTEN_MICRO_SEGMENTATION'
    | 'PROACTIVE_CERT_ROTATION'
    | 'TRIGGER_SOAR_LOCKDOWN'
    | 'ENFORCE_STEP_UP_AUTH'
    | 'DEPLOY_RATE_LIMIT';
  targetAssetOrSubnet: string;
  parameters: Record<string, unknown>;
  status: 'PROPOSED' | 'APPLIED' | 'REVERTED' | 'FAILED';
  appliedAt?: string;
  revertedAt?: string;
  justification: string;
}

export interface EarlyWarningAlert {
  alertId: string;
  forecastId: string;
  threatCategory: ThreatCategory;
  severityTier: AlertSeverityTier;
  probability: number;
  confidenceScore: number;
  title: string;
  summary: string;
  evidenceSignals: ThreatSignalEvidence[];
  recommendedActions: PreemptiveHardeningAction[];
  emittedAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}
