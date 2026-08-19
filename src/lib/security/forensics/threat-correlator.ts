/**
 * Forensic Threat Correlator
 * Sprint-041 (ZASM)
 */

import crypto from 'crypto';
import { RawSecuritySignal, CorrelatedThreatIncident, AttackStage } from './forensic-types';

export class ThreatCorrelator {
  /**
   * Maps a security signal to an ATT&CK stage
   */
  public static mapSignalToStage(signal: RawSecuritySignal): AttackStage {
    const type = signal.eventType.toUpperCase();

    if (type.includes('AUTH_FAIL') || type.includes('BRUTE') || type.includes('CREDENTIAL')) {
      return 'CREDENTIAL_ACCESS';
    }
    if (type.includes('IMPOSSIBLE_TRAVEL') || type.includes('GEO') || type.includes('ANOMALY')) {
      return 'INITIAL_ACCESS';
    }
    if (type.includes('TRUST_DROP') || type.includes('UNTRUSTED') || type.includes('TAMPER')) {
      return 'DEFENSE_EVASION';
    }
    if (type.includes('SEGMENTATION') || type.includes('DENY') || type.includes('PORT_SCAN')) {
      return 'LATERAL_MOVEMENT';
    }
    if (type.includes('EXFILTRATION') || type.includes('BURST_OUTBOUND')) {
      return 'EXFILTRATION';
    }
    if (type.includes('SOAR') || type.includes('QUARANTINE') || type.includes('LOCKDOWN')) {
      return 'IMPACT';
    }

    return 'DISCOVERY';
  }

  /**
   * Correlates raw signals by actor/entity and constructs threat incidents
   */
  public static correlate(signals: RawSecuritySignal[]): CorrelatedThreatIncident[] {
    const actorGroups: Map<string, RawSecuritySignal[]> = new Map();

    for (const s of signals) {
      const group = actorGroups.get(s.targetActorOrEntity) || [];
      group.push(s);
      actorGroups.set(s.targetActorOrEntity, group);
    }

    const incidents: CorrelatedThreatIncident[] = [];

    for (const [actor, groupSignals] of actorGroups.entries()) {
      const stagesSet = new Set<AttackStage>();
      for (const sig of groupSignals) {
        stagesSet.add(this.mapSignalToStage(sig));
      }

      const stages = Array.from(stagesSet);
      // Multi-stage attack confidence increases with number of stages detected
      const stageConfidenceBonus = Math.min(40, stages.length * 15);
      const severityScore = groupSignals.some((s) => s.severity === 'CRITICAL') ? 50 : 30;
      const confidenceScore = Math.min(100, severityScore + stageConfidenceBonus);

      const incidentId = `inc-${crypto.randomUUID().substring(0, 8)}`;
      const summary = `Correlated multi-stage security incident on actor '${actor}' across ${stages.length} attack stages (${stages.join(', ')})`;

      const mitreTactics = stages.map((s) => `TA00${s.substring(0, 2)}:${s}`);
      const mitigations = [
        'Apply immediate device quarantine via micro-segmentation',
        'Revoke active user sessions and DPoP cryptographic bindings',
        'Trigger SOAR containment playbook',
      ];

      incidents.push({
        incidentId,
        primaryActor: actor,
        confidenceScore,
        attackStagesDetected: stages,
        contributingSignals: groupSignals,
        summary,
        mitreTactics,
        recommendedMitigations: mitigations,
      });
    }

    return incidents;
  }
}
