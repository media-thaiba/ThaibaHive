/**
 * Micro-Segmentation Rule Compiler
 * Sprint-041 (ZASM)
 */

import { SegmentationPolicyRule, CompiledNetworkAcl, ProtocolType } from './segmentation-types';

export class RuleCompiler {
  /**
   * Compiles an abstract SegmentationPolicyRule into one or more concrete CompiledNetworkAcl entries
   */
  public static compileRule(policy: SegmentationPolicyRule): CompiledNetworkAcl[] {
    if (!policy.enabled) {
      return [];
    }

    const subnets = policy.sourceSubnets && policy.sourceSubnets.length > 0 ? policy.sourceSubnets : ['0.0.0.0/0'];
    const services = policy.destServices && policy.destServices.length > 0 ? policy.destServices : ['*'];
    const protocols: ProtocolType[] = policy.protocols && policy.protocols.length > 0 ? policy.protocols : ['ALL'];
    const ports = policy.destPorts && policy.destPorts.length > 0 ? policy.destPorts.map(String) : ['*'];

    const compiledAcls: CompiledNetworkAcl[] = [];

    for (const subnet of subnets) {
      for (const service of services) {
        for (const protocol of protocols) {
          for (const port of ports) {
            compiledAcls.push({
              ruleId: policy.id,
              action: policy.action,
              sourceIpPattern: subnet,
              destServicePattern: service,
              protocol,
              portPattern: port,
              vlanAssignment: policy.vlanTag,
              priority: policy.priority,
            });
          }
        }
      }
    }

    // Sort by priority (ascending: 1 is highest priority)
    return compiledAcls.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Compiles an entire array of policy rules into an unified ACL table
   */
  public static compileAll(policies: SegmentationPolicyRule[]): CompiledNetworkAcl[] {
    const allAcls: CompiledNetworkAcl[] = [];
    for (const policy of policies) {
      allAcls.push(...this.compileRule(policy));
    }
    return allAcls.sort((a, b) => a.priority - b.priority);
  }
}
