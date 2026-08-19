/**
 * Threat Indicators and Heuristic Classifications
 * Sprint-038 / AGS-005
 */

export type ThreatClassification = "clean" | "suspicious" | "malicious" | "banned";

export interface ThreatSignal {
  type: "dpop_replay" | "stepup_failure" | "not_found_scan" | "invalid_jwt" | "cross_tenant_probe" | "rate_limit_violation";
  timestamp: number;
  weight: number;
  metadata?: Record<string, unknown>;
}

export const THREAT_WEIGHTS: Record<ThreatSignal["type"], number> = {
  dpop_replay: 25, // 2 replays -> 50 pts
  stepup_failure: 20, // 2 step-up failures -> 40 pts
  invalid_jwt: 15,
  cross_tenant_probe: 30,
  not_found_scan: 5,
  rate_limit_violation: 5,
};

export interface IpReputationState {
  ip: string;
  threatScore: number; // 0 - 100
  classification: ThreatClassification;
  signals: ThreatSignal[];
  lastSeen: number;
  quarantineTriggered: boolean;
}
