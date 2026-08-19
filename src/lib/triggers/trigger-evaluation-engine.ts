export interface TriggerCondition {
  field: string;
  operator: ">" | "<" | "=" | "IN" | "CONTAINS";
  value: any;
}

export interface TriggerRuleDefinition {
  id: string;
  tenantId: string;
  ruleName: string;
  eventType: "absenteeism" | "fee_default" | "grade_drop" | "compliance_warning";
  conditions: TriggerCondition[];
  actionChannel: "sms" | "push" | "email" | "webhook";
  recipientGroup: "parents" | "staff" | "hods" | "principals";
  priority: "low" | "normal" | "high" | "urgent";
  isActive: boolean;
}

export interface TriggerEvaluationResult {
  ruleId: string;
  ruleName: string;
  eventType: string;
  matched: boolean;
  actionChannel: "sms" | "push" | "email" | "webhook";
  recipientGroup: "parents" | "staff" | "hods" | "principals";
  priority: "low" | "normal" | "high" | "urgent";
  payload: Record<string, any>;
  evaluatedAt: string;
}

export class TriggerEvaluationEngine {
  private rules: TriggerRuleDefinition[] = [];

  constructor(initialRules: TriggerRuleDefinition[] = []) {
    this.rules = initialRules;
  }

  registerRule(rule: TriggerRuleDefinition): void {
    this.rules.push(rule);
  }

  evaluateCondition(eventValue: any, operator: string, ruleValue: any): boolean {
    if (eventValue === undefined || eventValue === null) return false;

    switch (operator) {
      case ">":
        return Number(eventValue) > Number(ruleValue);
      case "<":
        return Number(eventValue) < Number(ruleValue);
      case "=":
        return String(eventValue) === String(ruleValue);
      case "IN":
        return Array.isArray(ruleValue) && ruleValue.includes(eventValue);
      case "CONTAINS":
        return String(eventValue).toLowerCase().includes(String(ruleValue).toLowerCase());
      default:
        return false;
    }
  }

  evaluateEvent(
    tenantId: string,
    eventType: string,
    eventPayload: Record<string, any>
  ): TriggerEvaluationResult[] {
    const activeTenantRules = this.rules.filter(
      (r) => r.tenantId === tenantId && r.eventType === eventType && r.isActive
    );

    const results: TriggerEvaluationResult[] = [];
    const now = new Date().toISOString();

    for (const rule of activeTenantRules) {
      let allMatched = true;
      for (const cond of rule.conditions) {
        const val = eventPayload[cond.field];
        if (!this.evaluateCondition(val, cond.operator, cond.value)) {
          allMatched = false;
          break;
        }
      }

      if (allMatched) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          eventType: rule.eventType,
          matched: true,
          actionChannel: rule.actionChannel,
          recipientGroup: rule.recipientGroup,
          priority: rule.priority,
          payload: {
            ...eventPayload,
            triggeredByRule: rule.ruleName,
            triggeredAt: now,
          },
          evaluatedAt: now,
        });
      }
    }

    return results;
  }
}

export const defaultTriggerEngine = new TriggerEvaluationEngine();
