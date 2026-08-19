/**
 * Dynamic Micro-Segmentation Policy Engine Type Definitions
 * Sprint-041 (ZASM)
 */

import { TrustTier } from '../trust/trust-types';

export type PolicyAction = 'ALLOW' | 'DENY' | 'QUARANTINE' | 'STEP_UP_AUTH';
export type ProtocolType = 'TCP' | 'UDP' | 'ICMP' | 'ALL';

export interface SegmentationPolicyRule {
  id: string;
  name: string;
  description?: string;
  priority: number; // 1 (highest) to 1000 (lowest)
  action: PolicyAction;
  targetTrustTiers: TrustTier[];
  sourceSubnets?: string[];  // CIDR blocks or IPs
  destServices?: string[];   // Service identifiers or domain wildcards
  protocols?: ProtocolType[];
  destPorts?: number[];      // e.g. [443, 8080]
  vlanTag?: number;          // e.g. VLAN 10 (Prod), VLAN 99 (Quarantine)
  enabled: boolean;
  tenantId?: string;
}

export interface CompiledNetworkAcl {
  ruleId: string;
  action: PolicyAction;
  sourceIpPattern: string;
  destServicePattern: string;
  protocol: ProtocolType;
  portPattern: string;
  vlanAssignment?: number;
  priority: number;
}

export interface TrafficEvaluationRequest {
  sourceIp: string;
  deviceId?: string;
  trustTier: TrustTier;
  targetService: string;
  destPort: number;
  protocol: ProtocolType;
  tenantId?: string;
}

export interface TrafficEvaluationResult {
  allowed: boolean;
  action: PolicyAction;
  matchedRuleId?: string;
  matchedRuleName?: string;
  vlanAssignment?: number;
  reason: string;
  evaluatedAt: string;
}

export interface NetworkSegmentationAdapter {
  name: string;
  applyPolicy(rules: CompiledNetworkAcl[]): Promise<{ success: boolean; rulesApplied: number; details?: any }>;
  revertPolicy(ruleIds: string[]): Promise<{ success: boolean; rulesReverted: number }>;
}
