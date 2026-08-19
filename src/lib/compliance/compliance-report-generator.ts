import { ComplianceFinding } from './compliance-rule-engine';

export interface ComplianceReport {
  generatedAt: string;
  findings: ComplianceFinding[];
  totalFindings: number;
  passCount: number;
  failCount: number;
  warnCount: number;
  requiresHumanReview: boolean;
  markdownSummary?: string;
}

/**
 * Sprint-020 ComplianceReportGenerator — formats ComplianceFinding[] into structured reports.
 * Supports JSON (machine-readable) and Markdown (human-readable) output formats.
 * Sets requiresHumanReview=true when any critical severity finding has status=fail.
 */
export class ComplianceReportGenerator {
  generate(findings: ComplianceFinding[], format: 'json' | 'markdown'): ComplianceReport {
    const hasCriticalFail = findings.some((f) => f.severity === 'critical' && f.status === 'fail');
    const passCount = findings.filter((f) => f.status === 'pass').length;
    const failCount = findings.filter((f) => f.status === 'fail').length;
    const warnCount = findings.filter((f) => f.status === 'warn').length;

    const report: ComplianceReport = {
      generatedAt: new Date().toISOString(),
      findings,
      totalFindings: findings.length,
      passCount,
      failCount,
      warnCount,
      requiresHumanReview: hasCriticalFail,
    };

    if (format === 'markdown') {
      const lines = [
        '# Compliance Report',
        `**Generated:** ${report.generatedAt}`,
        `**Total:** ${findings.length} | ✅ ${passCount} pass | ❌ ${failCount} fail | ⚠️ ${warnCount} warn`,
        hasCriticalFail ? '\n> ⚠️ **Human review required** — critical findings detected.\n' : '',
        '## Findings',
        ...findings.map(
          (f) => `- [${f.status.toUpperCase()}] \`${f.ruleId}\` (${f.framework}): ${f.evidence}\n  > ${f.remediationGuidance}`
        ),
      ];
      report.markdownSummary = lines.filter(Boolean).join('\n');
    }

    return report;
  }
}