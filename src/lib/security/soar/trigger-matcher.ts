/**
 * SOAR Trigger Matching Engine
 * Sprint-040 — Event-to-Playbook Route Matching
 */

import { SecurityPlaybook, PlaybookTrigger } from './soar-types';
import { ConditionEvaluator } from './condition-evaluator';

export interface SoarIncomingEvent {
  event_type: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source?: string;
  confidence?: number;
  payload: Record<string, any>;
  timestamp?: string;
}

export class TriggerMatcher {
  /**
   * Find all active playbooks that match the incoming threat event
   */
  public static findMatchingPlaybooks(
    event: SoarIncomingEvent,
    playbooks: SecurityPlaybook[]
  ): SecurityPlaybook[] {
    return playbooks.filter(playbook => {
      if (!playbook.enabled) return false;

      // Check each trigger defined in the playbook
      return playbook.triggers.some(trigger => this.isTriggerMatch(trigger, event));
    });
  }

  /**
   * Check if a specific trigger matches the event
   */
  public static isTriggerMatch(trigger: PlaybookTrigger, event: SoarIncomingEvent): boolean {
    // 1. Event Type check
    if (trigger.event_type !== '*' && trigger.event_type !== event.event_type) {
      return false;
    }

    // 2. Severity check (if defined in trigger)
    if (trigger.severity && event.severity) {
      const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      const triggerSev = severityOrder[trigger.severity] || 0;
      const eventSev = severityOrder[event.severity] || 0;
      if (eventSev < triggerSev) return false;
    }

    // 3. Source check (if defined in trigger)
    if (trigger.source && event.source && trigger.source !== '*' && trigger.source !== event.source) {
      return false;
    }

    // 4. Minimum Confidence check (if defined in trigger)
    if (trigger.confidence_min !== undefined && event.confidence !== undefined) {
      if (event.confidence < trigger.confidence_min) return false;
    }

    // 5. Custom Condition evaluation (if defined in trigger)
    if (trigger.condition) {
      const evalContext = {
        event_type: event.event_type,
        severity: event.severity,
        source: event.source,
        confidence: event.confidence,
        ...event.payload,
        trigger: event.payload,
      };
      if (!ConditionEvaluator.evaluate(trigger.condition, evalContext)) {
        return false;
      }
    }

    return true;
  }
}
