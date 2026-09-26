/**
 * ARES to SOAR Mitigation Dispatcher Bridge
 * Sprint-042 (ARES) — ARES-004
 */

import { EarlyWarningAlert } from './ares-types';
import { SoarOrchestrator } from '../soar/orchestrator';
import { CANONICAL_SECURITY_PLAYBOOKS } from '../soar/playbooks/definitions';
import { PreemptiveHardeningController } from './preemptive-hardening';

export interface PreemptiveSoarDispatchResult {
  alertId: string;
  threatCategory: string;
  playbookName: string;
  executionId?: string;
  status: 'DISPATCHED' | 'SKIPPED' | 'FAILED';
  timestamp: string;
}

export class AresSoarBridge {
  private static instance: AresSoarBridge | null = null;
  private orchestrator: SoarOrchestrator;
  private hardeningController: PreemptiveHardeningController;
  private dispatchHistory: PreemptiveSoarDispatchResult[] = [];

  private constructor(orchestrator?: SoarOrchestrator, hardeningController?: PreemptiveHardeningController) {
    this.orchestrator = orchestrator || SoarOrchestrator.getInstance();
    this.hardeningController = hardeningController || PreemptiveHardeningController.getInstance();
  }

  public static getInstance(
    orchestrator?: SoarOrchestrator,
    hardeningController?: PreemptiveHardeningController
  ): AresSoarBridge {
    if (!AresSoarBridge.instance) {
      AresSoarBridge.instance = new AresSoarBridge(orchestrator, hardeningController);
    }
    return AresSoarBridge.instance;
  }

  public static resetInstance(): void {
    AresSoarBridge.instance = null;
  }

  /**
   * Dispatches proactive SOAR containment playbook when early warning alert reaches critical/high severity
   */
  public async handleEarlyWarningAlert(alert: EarlyWarningAlert): Promise<PreemptiveSoarDispatchResult | null> {
    if (alert.severityTier !== 'CRITICAL_FORECAST' && alert.severityTier !== 'HIGH_FORECAST') {
      return null;
    }

    // Select suitable playbook
    let targetPlaybook = CANONICAL_SECURITY_PLAYBOOKS.find((p) => p.name === 'COMPROMISED_ACCOUNT_LOCKDOWN');
    if (alert.threatCategory === 'DISTRIBUTED_DENIAL_OF_SERVICE' || alert.threatCategory === 'ZERO_DAY_EXPLOIT') {
      targetPlaybook =
        CANONICAL_SECURITY_PLAYBOOKS.find((p) => p.name === 'IP_QUARANTINE_AUTO_MITIGATION') || targetPlaybook;
    }

    if (!targetPlaybook) {
      return null;
    }

    let executionId: string | undefined;
    let status: 'DISPATCHED' | 'FAILED' = 'DISPATCHED';

    try {
      const execution = await this.orchestrator.executePlaybook(
        targetPlaybook,
        {
          source: 'ares:predictive_engine',
          event_type: 'PREDICTIVE_THREAT_DETECTED',
          confidence: alert.confidenceScore,
          threatCategory: alert.threatCategory,
          probability: alert.probability,
          alertId: alert.alertId,
        },
        {
          type: 'SUBNET',
          value: alert.recommendedActions[0]?.targetAssetOrSubnet || 'primary-cluster',
        }
      );
      executionId = execution.execution_id;

      // Plan corresponding preemptive hardening action
      this.hardeningController.planHardeningAction(
        alert.threatCategory,
        alert.recommendedActions[0]?.targetAssetOrSubnet || 'primary-cluster',
        'TRIGGER_SOAR_LOCKDOWN',
        `Autonomous mitigation dispatched via playbook ${targetPlaybook.name}`
      );
    } catch {
      status = 'FAILED';
    }

    const result: PreemptiveSoarDispatchResult = {
      alertId: alert.alertId,
      threatCategory: alert.threatCategory,
      playbookName: targetPlaybook.name,
      executionId,
      status,
      timestamp: new Date().toISOString(),
    };

    this.dispatchHistory.push(result);
    return result;
  }

  public getDispatchHistory(): PreemptiveSoarDispatchResult[] {
    return [...this.dispatchHistory];
  }
}
