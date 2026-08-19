/**
 * Device Trust to SOAR Containment Bridge
 * Sprint-041 (ZASM)
 */

import { DeviceTrustScore } from './trust-types';
import { SoarOrchestrator } from '../soar/orchestrator';
import { CANONICAL_SECURITY_PLAYBOOKS } from '../soar/playbooks/definitions';

export interface LowTrustMitigationEvent {
  deviceId: string;
  previousScore?: number;
  newScore: number;
  tier: string;
  playbookTriggered?: string;
  executionId?: string;
  timestamp: string;
}

export class TrustSoarBridge {
  private static instance: TrustSoarBridge | null = null;
  private orchestrator: SoarOrchestrator;
  private mitigationHistory: LowTrustMitigationEvent[] = [];

  private constructor(orchestrator?: SoarOrchestrator) {
    this.orchestrator = orchestrator || SoarOrchestrator.getInstance();
  }

  public static getInstance(orchestrator?: SoarOrchestrator): TrustSoarBridge {
    if (!TrustSoarBridge.instance) {
      TrustSoarBridge.instance = new TrustSoarBridge(orchestrator);
    }
    return TrustSoarBridge.instance;
  }

  public static resetInstance(): void {
    TrustSoarBridge.instance = null;
  }

  /**
   * Evaluates trust score and dispatches SOAR containment playbooks if trust drops below threshold
   */
  public async handleTrustEvaluation(
    trustScore: DeviceTrustScore,
    previousScore?: number
  ): Promise<LowTrustMitigationEvent | null> {
    return this.handleTrustScoreChange(trustScore, previousScore);
  }

  public async handleTrustScoreChange(
    trustScore: DeviceTrustScore,
    previousScore?: number
  ): Promise<LowTrustMitigationEvent | null> {
    // If device is Untrusted or Low Trust (score < 50), trigger autonomous SOAR containment
    if (trustScore.score >= 50 && trustScore.tier !== 'UNTRUSTED') {
      return null;
    }

    const targetPlaybook =
      CANONICAL_SECURITY_PLAYBOOKS.find((p) => p.name === 'COMPROMISED_ACCOUNT_LOCKDOWN') ||
      CANONICAL_SECURITY_PLAYBOOKS[0];

    let executionId: string | undefined;

    if (targetPlaybook) {
      const execution = await this.orchestrator.executePlaybook(
        targetPlaybook,
        {
          source: 'zasm:device_trust_engine',
          event_type: 'LOW_DEVICE_TRUST_DETECTED',
          confidence: 90,
          deviceId: trustScore.deviceId,
          score: trustScore.score,
          tier: trustScore.tier,
          reasons: trustScore.penaltiesApplied.map((p) => p.reason),
        },
        {
          type: 'IP',
          value: trustScore.deviceId,
        }
      );
      executionId = execution.execution_id;
    }

    const event: LowTrustMitigationEvent = {
      deviceId: trustScore.deviceId,
      previousScore,
      newScore: trustScore.score,
      tier: trustScore.tier,
      playbookTriggered: targetPlaybook?.name,
      executionId,
      timestamp: new Date().toISOString(),
    };

    this.mitigationHistory.push(event);
    return event;
  }

  /**
   * Lists historical containment triggers
   */
  public getMitigationHistory(): LowTrustMitigationEvent[] {
    return [...this.mitigationHistory];
  }
}
