/**
 * Live Threat Intelligence Graph Types
 * Sprint-042 (ARES) — ARES-012
 */

export type GraphNodeType =
  | 'ThreatActor'
  | 'AttackVector'
  | 'Vulnerability_CVE'
  | 'Asset'
  | 'Service'
  | 'Subnet'
  | 'Identity';

export type GraphEdgeType =
  | 'TARGETS'
  | 'EXPLOITS'
  | 'CONNECTS_TO'
  | 'DEPENDS_ON'
  | 'INDICATES'
  | 'AFFECTS'
  | 'PART_OF'
  | 'MITIGATED_BY';

export interface ThreatGraphNode {
  id: string;
  type: GraphNodeType;
  name: string;
  severity?: string;
  riskScore: number; // 0 - 100
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  weight: number; // 0.0 to 1.0 (exploit difficulty / connection strength)
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AttackPathResult {
  sourceThreatNode: ThreatGraphNode;
  targetAssetNode: ThreatGraphNode;
  pathNodes: ThreatGraphNode[];
  pathEdges: ThreatGraphEdge[];
  cumulativeRiskScore: number;
  hopCount: number;
  criticalChokePointNodeId?: string;
}

export interface StixBundlePayload {
  type: 'bundle';
  id: string;
  objects: Array<{
    type: string;
    id: string;
    name?: string;
    description?: string;
    created?: string;
    modified?: string;
    labels?: string[];
    external_references?: Array<{ source_name: string; external_id?: string; url?: string }>;
    [key: string]: unknown;
  }>;
}
