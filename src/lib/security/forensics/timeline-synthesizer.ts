/**
 * Forensic Attack Timeline Synthesizer
 * Sprint-041 (ZASM)
 */

import { CorrelatedThreatIncident, ForensicTimelineEvent } from './forensic-types';
import { ThreatCorrelator } from './threat-correlator';

export class TimelineSynthesizer {
  /**
   * Synthesizes an ordered chronological forensic timeline from a threat incident
   */
  public static synthesize(incident: CorrelatedThreatIncident): ForensicTimelineEvent[] {
    const sortedSignals = [...incident.contributingSignals].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sortedSignals.map((sig, idx) => ({
      sequenceNumber: idx + 1,
      timestamp: sig.timestamp,
      layer: sig.sourceLayer,
      stage: ThreatCorrelator.mapSignalToStage(sig),
      description: `${sig.eventType} detected on ${sig.sourceLayer} (${sig.severity})`,
      rawSignalId: sig.id,
      severity: sig.severity,
    }));
  }
}
