/**
 * SOAR Confidence Thresholding Gate
 * Sprint-040 — Risk-Based Automation Routing
 */

import { SecurityPlaybook } from './soar-types';

export type ConfidenceDecisionType = 'AUTO_EXECUTE' | 'REQUIRE_APPROVAL' | 'LOG_ONLY';

export interface ConfidenceDecision {
  decision: ConfidenceDecisionType;
  confidence: number;
  playbook_id: string;
  reason: string;
}

export interface ConfidenceGateConfig {
  autoExecuteMinConfidence?: number;
  requireApprovalMinConfidence?: number;
}

export class ConfidenceGate {
  private static instance: ConfidenceGate;
  private autoExecuteMinConfidence = 80;
  private requireApprovalMinConfidence = 60;

  private constructor(config?: ConfidenceGateConfig) {
    if (config?.autoExecuteMinConfidence !== undefined) {
      this.autoExecuteMinConfidence = config.autoExecuteMinConfidence;
    }
    if (config?.requireApprovalMinConfidence !== undefined) {
      this.requireApprovalMinConfidence = config.requireApprovalMinConfidence;
    }
  }

  public static getInstance(config?: ConfidenceGateConfig): ConfidenceGate {
    if (!ConfidenceGate.instance) {
      ConfidenceGate.instance = new ConfidenceGate(config);
    }
    return ConfidenceGate.instance;
  }

  /**
   * Determine the execution strategy based on threat confidence score and playbook policy
   */
  public evaluate(confidence: number, playbook: SecurityPlaybook): ConfidenceDecision {
    const normalizedConfidence = Math.max(0, Math.min(100, confidence || 0));

    // High impact playbooks always mandate human-in-the-loop approval unless disabled
    if (playbook.high_impact) {
      return {
        decision: 'REQUIRE_APPROVAL',
        confidence: normalizedConfidence,
        playbook_id: playbook.id,
        reason: `Playbook '${playbook.name}' is flagged as high-impact (requires manual approval)`,
      };
    }

    // Check if auto_execute is disabled on the playbook
    if (!playbook.auto_execute) {
      return {
        decision: 'REQUIRE_APPROVAL',
        confidence: normalizedConfidence,
        playbook_id: playbook.id,
        reason: `Playbook '${playbook.name}' has auto_execute disabled by configuration`,
      };
    }

    // Check confidence against thresholds
    const minConfidence = playbook.min_confidence || this.autoExecuteMinConfidence;

    if (normalizedConfidence >= minConfidence && normalizedConfidence >= this.autoExecuteMinConfidence) {
      return {
        decision: 'AUTO_EXECUTE',
        confidence: normalizedConfidence,
        playbook_id: playbook.id,
        reason: `Confidence score (${normalizedConfidence}%) meets autonomous threshold (>= ${minConfidence}%)`,
      };
    }

    if (normalizedConfidence >= this.requireApprovalMinConfidence) {
      return {
        decision: 'REQUIRE_APPROVAL',
        confidence: normalizedConfidence,
        playbook_id: playbook.id,
        reason: `Confidence score (${normalizedConfidence}%) requires SOC admin review (${this.requireApprovalMinConfidence}-${this.autoExecuteMinConfidence - 1}%)`,
      };
    }

    return {
      decision: 'LOG_ONLY',
      confidence: normalizedConfidence,
      playbook_id: playbook.id,
      reason: `Confidence score (${normalizedConfidence}%) is below minimum actionable threshold (< ${this.requireApprovalMinConfidence}%)`,
    };
  }
}

export const confidenceGate = ConfidenceGate.getInstance();
