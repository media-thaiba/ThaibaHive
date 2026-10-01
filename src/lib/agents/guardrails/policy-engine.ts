import { TenantContext } from "../tools/contract";

export interface PolicyConstraint {
  id: string;
  name: string;
  description: string;
  domain: string;
  validate(input: any, tenant: TenantContext): { allowed: boolean; violationReason?: string };
}

export class PolicyEngine {
  private static instance: PolicyEngine;
  private policies: Map<string, PolicyConstraint> = new Map();

  constructor() {
    this.registerDefaultPolicies();
  }

  public static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  private registerDefaultPolicies() {
    // Financial power threshold policy
    this.policies.set("finance.max_autonomous_waiver", {
      id: "finance.max_autonomous_waiver",
      name: "Max Autonomous Fee Waiver Cap",
      description: "Agents cannot autonomously waive amounts exceeding INR 25,000 without Principal role",
      domain: "finance",
      validate: (input, tenant) => {
        if (input.amount && input.amount > 25000 && tenant.userRole !== "principal" && tenant.userRole !== "super_admin") {
          return {
            allowed: false,
            violationReason: `Fee waiver amount ${input.amount} exceeds autonomous cap of 25,000 for role ${tenant.userRole}`,
          };
        }
        return { allowed: true };
      },
    });

    // Security safety lockdown policy
    this.policies.set("security.lockdown_authorization", {
      id: "security.lockdown_authorization",
      name: "Campus Lockdown Authorization Constraint",
      description: "Campus-wide lockdowns require emergency permission and cannot be triggered by staff role",
      domain: "security",
      validate: (input, tenant) => {
        if (input.lockdownType === "full_campus" && tenant.userRole === "staff") {
          return {
            allowed: false,
            violationReason: "Full campus lockdown cannot be initiated by staff role without admin escalation",
          };
        }
        return { allowed: true };
      },
    });
  }

  public registerPolicy(policy: PolicyConstraint): void {
    this.policies.set(policy.id, policy);
  }

  public evaluatePreFlight(
    toolName: string,
    input: any,
    tenant: TenantContext
  ): { allowed: boolean; violationReason?: string } {
    for (const policy of this.policies.values()) {
      if (toolName.startsWith(policy.domain)) {
        const result = policy.validate(input, tenant);
        if (!result.allowed) {
          return result;
        }
      }
    }
    return { allowed: true };
  }
}

export const policyEngine = PolicyEngine.getInstance();
