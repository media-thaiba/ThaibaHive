import { ComplianceEvent, ComplianceViolationReport, TelemetrySummary, ViolationSeverity } from "./types";
import { COMPLIANCE_RULES, ComplianceRuleDefinition, AnomalyHistoryTracker } from "./detection-rules";
import { violationDispatcher } from "./violation-dispatcher";

class InMemoryHistoryTracker implements AnomalyHistoryTracker {
  private events: Map<string, number[]> = new Map();

  recordEvent(key: string): void {
    const now = Date.now();
    if (!this.events.has(key)) {
      this.events.set(key, []);
    }
    const timestamps = this.events.get(key)!;
    timestamps.push(now);

    // Prune events older than 1 hour
    const oneHourAgo = now - 3600 * 1000;
    this.events.set(
      key,
      timestamps.filter((t) => t >= oneHourAgo)
    );
  }

  getRecentEventCount(key: string, windowSeconds: number): number {
    const timestamps = this.events.get(key) || [];
    const threshold = Date.now() - windowSeconds * 1000;
    return timestamps.filter((t) => t >= threshold).length;
  }

  clear() {
    this.events.clear();
  }
}

export class AuditAnomalyDetector {
  private rules: ComplianceRuleDefinition[] = [...COMPLIANCE_RULES];
  private historyTracker = new InMemoryHistoryTracker();
  private lastEvaluatedAt = new Date().toISOString();

  /**
   * Evaluates a mutation or compliance event against all active rules
   */
  evaluate(event: ComplianceEvent): ComplianceViolationReport[] {
    this.lastEvaluatedAt = new Date().toISOString();
    const violations: ComplianceViolationReport[] = [];

    for (const rule of this.rules) {
      try {
        const report = rule.evaluate(event, this.historyTracker);
        if (report) {
          violations.push(report);
          // Dispatch violation asynchronously
          violationDispatcher.dispatch(event, report).catch((err) => {
            console.error("[@thaiba/compliance] Failed to dispatch violation:", err);
          });
        }
      } catch (ruleErr) {
        console.warn(`[@thaiba/compliance] Rule ${rule.id} execution failed:`, ruleErr);
      }
    }

    return violations;
  }

  /**
   * Registers a custom rule definition
   */
  registerRule(rule: ComplianceRuleDefinition) {
    this.rules.push(rule);
  }

  getRules(): ComplianceRuleDefinition[] {
    return this.rules;
  }

  getLastEvaluatedAt(): string {
    return this.lastEvaluatedAt;
  }

  resetHistory() {
    this.historyTracker.clear();
  }
}

export const auditAnomalyDetector = new AuditAnomalyDetector();
