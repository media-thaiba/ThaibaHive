/**
 * Threat Intelligence Graph Schema & Constants
 * Sprint-042 (ARES) — ARES-012
 */

import { GraphNodeType, GraphEdgeType } from './graph-types';

export const GRAPH_NODE_TYPES: GraphNodeType[] = [
  'ThreatActor',
  'AttackVector',
  'Vulnerability_CVE',
  'Asset',
  'Service',
  'Subnet',
  'Identity',
];

export const GRAPH_EDGE_TYPES: GraphEdgeType[] = [
  'TARGETS',
  'EXPLOITS',
  'CONNECTS_TO',
  'DEPENDS_ON',
  'INDICATES',
  'AFFECTS',
  'PART_OF',
  'MITIGATED_BY',
];
