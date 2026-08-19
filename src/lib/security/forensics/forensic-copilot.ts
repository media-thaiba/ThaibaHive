/**
 * Advanced Forensic Root-Cause Analysis Copilot
 * Sprint-041 (ZASM)
 */

import crypto from 'crypto';
import {
  RawSecuritySignal,
  ForensicInvestigationReport,
} from './forensic-types';
import { ThreatCorrelator } from './threat-correlator';
import { TimelineSynthesizer } from './timeline-synthesizer';
import { RootCauseGraph } from './root-cause-graph';

export class ForensicCopilot {
  private static recentReports: Map<string, ForensicInvestigationReport> = new Map();

  /**
   * Conducts automated forensic root-cause analysis on a set of security signals
   */
  public static async analyze(signals: RawSecuritySignal[]): Promise<ForensicInvestigationReport[]> {
    const startTime = Date.now();
    const correlatedIncidents = ThreatCorrelator.correlate(signals);
    const reports: ForensicInvestigationReport[] = [];

    for (const inc of correlatedIncidents) {
      const timeline = TimelineSynthesizer.synthesize(inc);
      const graph = RootCauseGraph.generate(inc);
      const durationMs = Date.now() - startTime;
      const reportId = `report-${crypto.randomUUID().substring(0, 8)}`;

      const executiveSummary = `Forensic analysis identified a correlated multi-stage threat targeting actor/device '${inc.primaryActor}'. Attack progressed through ${inc.attackStagesDetected.length} distinct stages (${inc.attackStagesDetected.join(' -> ')}). Root cause is attributed to ${timeline[0]?.description || 'unauthorized entry point'}.`;

      const technicalDetails = [
        `Incident ID: ${inc.incidentId}`,
        `Confidence: ${inc.confidenceScore}%`,
        `Contributing Signals: ${inc.contributingSignals.length}`,
        `MITRE ATT&CK Tactics: ${inc.mitreTactics.join(', ')}`,
        `Recommended Mitigations:`,
        ...inc.recommendedMitigations.map((m) => ` - ${m}`),
      ].join('\n');

      const report: ForensicInvestigationReport = {
        reportId,
        incidentId: inc.incidentId,
        primaryActor: inc.primaryActor,
        executiveSummary,
        technicalDetails,
        timeline,
        rootCauseGraph: graph,
        durationMs,
        generatedAt: new Date().toISOString(),
      };

      this.recentReports.set(reportId, report);
      reports.push(report);
    }

    return reports;
  }

  /**
   * Retrieves a report by ID
   */
  public static getReport(reportId: string): ForensicInvestigationReport | undefined {
    return this.recentReports.get(reportId);
  }

  /**
   * Lists all recent reports
   */
  public static listReports(): ForensicInvestigationReport[] {
    return Array.from(this.recentReports.values()).sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }
}
