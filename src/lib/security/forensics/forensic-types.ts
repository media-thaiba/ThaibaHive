/**
 * Advanced Forensic Copilot Type Definitions
 * Sprint-041 (ZASM)
 */

export type AttackStage =
  | 'INITIAL_ACCESS'
  | 'EXECUTION'
  | 'PERSISTENCE'
  | 'PRIVILEGE_ESCALATION'
  | 'DEFENSE_EVASION'
  | 'CREDENTIAL_ACCESS'
  | 'DISCOVERY'
  | 'LATERAL_MOVEMENT'
  | 'EXFILTRATION'
  | 'IMPACT';

export interface RawSecuritySignal {
  id: string;
  sourceLayer: 'MTLS_MESH' | 'DEVICE_TRUST' | 'MICRO_SEGMENTATION' | 'SOAR_PLAYBOOK' | 'WAF_EDGE' | 'AUTH_LOG' | 'SBOM_SCAN';
  targetActorOrEntity: string; // IP, User ID, Device ID, or Service Name
  eventType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  details: Record<string, any>;
  timestamp: string; // ISO string
}

export interface CorrelatedThreatIncident {
  incidentId: string;
  primaryActor: string;
  confidenceScore: number; // 0-100
  attackStagesDetected: AttackStage[];
  contributingSignals: RawSecuritySignal[];
  summary: string;
  mitreTactics: string[];
  recommendedMitigations: string[];
}

export interface ForensicTimelineEvent {
  sequenceNumber: number;
  timestamp: string;
  layer: string;
  stage: AttackStage;
  description: string;
  rawSignalId: string;
  severity: string;
}

export interface RootCauseGraphNode {
  id: string;
  label: string;
  type: 'ACTOR' | 'SIGNAL' | 'STAGE' | 'TARGET';
  severity?: string;
}

export interface RootCauseGraphEdge {
  from: string;
  to: string;
  relationship: 'TRIGGERED' | 'ESCALATED_TO' | 'TARGETED' | 'CONTAINED_BY';
}

export interface ForensicInvestigationReport {
  reportId: string;
  incidentId: string;
  primaryActor: string;
  executiveSummary: string;
  technicalDetails: string;
  timeline: ForensicTimelineEvent[];
  rootCauseGraph: {
    nodes: RootCauseGraphNode[];
    edges: RootCauseGraphEdge[];
  };
  durationMs: number;
  generatedAt: string;
}
