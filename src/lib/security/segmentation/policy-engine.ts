/**
 * Dynamic Micro-Segmentation Policy Engine
 * Sprint-041 (ZASM)
 */

import {
  SegmentationPolicyRule,
  TrafficEvaluationRequest,
  TrafficEvaluationResult,
} from './segmentation-types';

export class PolicyEngine {
  private static instance: PolicyEngine | null = null;
  private policies: Map<string, SegmentationPolicyRule> = new Map();

  private constructor() {
    this.registerDefaultPolicies();
  }

  public static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  public static resetInstance(): void {
    PolicyEngine.instance = null;
  }

  /**
   * Registers default baseline policies
   */
  private registerDefaultPolicies(): void {
    // 1. Explicit Quarantine / Isolation for Untrusted devices (Priority 10)
    this.addPolicy({
      id: 'default-untrusted-quarantine',
      name: 'Default Untrusted Device Quarantine',
      priority: 10,
      action: 'QUARANTINE',
      targetTrustTiers: ['UNTRUSTED'],
      vlanTag: 99, // Isolated remediation VLAN
      enabled: true,
    });

    // 2. High-Trust Full Access to Campus Services (Priority 100)
    this.addPolicy({
      id: 'default-high-trust-allow',
      name: 'High Trust Enterprise Full Access',
      priority: 100,
      action: 'ALLOW',
      targetTrustTiers: ['HIGH_TRUST'],
      vlanTag: 10, // Prod VLAN
      enabled: true,
    });

    // 3. Medium-Trust Restricted Access (Priority 200)
    this.addPolicy({
      id: 'default-medium-trust-restricted',
      name: 'Medium Trust Standard Access',
      priority: 200,
      action: 'ALLOW',
      targetTrustTiers: ['MEDIUM_TRUST'],
      destServices: ['academic-service', 'portal', 'library'],
      vlanTag: 20, // Guest/Student VLAN
      enabled: true,
    });

    // 4. Low-Trust Step-Up / Restricted Access (Priority 300)
    this.addPolicy({
      id: 'default-low-trust-step-up',
      name: 'Low Trust Step-Up Authentication Required',
      priority: 300,
      action: 'STEP_UP_AUTH',
      targetTrustTiers: ['LOW_TRUST'],
      vlanTag: 30, // Inspection VLAN
      enabled: true,
    });
  }

  /**
   * Adds or updates a policy
   */
  public addPolicy(policy: SegmentationPolicyRule): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Removes a policy by ID
   */
  public removePolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Retrieves a policy by ID
   */
  public getPolicy(policyId: string): SegmentationPolicyRule | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Lists all policies sorted by priority
   */
  public listPolicies(): SegmentationPolicyRule[] {
    return Array.from(this.policies.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluates traffic against the policy matrix
   */
  public evaluateTraffic(request: TrafficEvaluationRequest): TrafficEvaluationResult {
    const sortedPolicies = this.listPolicies().filter((p) => p.enabled);

    for (const policy of sortedPolicies) {
      // 1. Match Trust Tier
      if (!policy.targetTrustTiers.includes(request.trustTier)) {
        continue;
      }

      // 2. Match Target Service (if specified)
      if (policy.destServices && policy.destServices.length > 0 && !policy.destServices.includes('*')) {
        const matchesService = policy.destServices.some(
          (s) => s === request.targetService || request.targetService.startsWith(s.replace('*', ''))
        );
        if (!matchesService) {
          continue;
        }
      }

      // 3. Match Protocol (if specified)
      if (policy.protocols && policy.protocols.length > 0 && !policy.protocols.includes('ALL')) {
        if (!policy.protocols.includes(request.protocol)) {
          continue;
        }
      }

      // 4. Match Port (if specified)
      if (policy.destPorts && policy.destPorts.length > 0) {
        if (!policy.destPorts.includes(request.destPort)) {
          continue;
        }
      }

      // Match found!
      const allowed = policy.action === 'ALLOW';
      return {
        allowed,
        action: policy.action,
        matchedRuleId: policy.id,
        matchedRuleName: policy.name,
        vlanAssignment: policy.vlanTag,
        reason: `Matched micro-segmentation rule '${policy.name}' (${policy.action})`,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Default Deny Baseline
    return {
      allowed: false,
      action: 'DENY',
      reason: 'Default-deny baseline: No explicit micro-segmentation rule matched request parameters',
      evaluatedAt: new Date().toISOString(),
    };
  }
}
