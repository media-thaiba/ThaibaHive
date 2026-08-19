import { ComplianceRuleEngine } from '../compliance/compliance-rule-engine';
import { ComplianceReportGenerator } from '../compliance/compliance-report-generator';

describe('Compliance Engine End-to-End', () => {
  test('All 5 frameworks evaluated and reports generated', async () => {
    const engine = new ComplianceRuleEngine();
    const result = await engine.evaluateInstitution('inst_e2e', [
      'gdpr', 'hipaa', 'soc2', 'ferpa', 'malaysia-education'
    ]);

    expect(result.institutionId).toBe('inst_e2e');
    expect(result.frameworksEvaluated).toHaveLength(5);
    expect(result.findings.length).toBeGreaterThan(0);

    const generator = new ComplianceReportGenerator();
    const report = generator.generate(result.findings, 'json');
    expect(report).toBeDefined();
    expect(report.totalFindings).toBe(result.findings.length);
    expect(typeof report.requiresHumanReview).toBe('boolean');
  });

  test('Cross-tenant isolation: institution A data does not appear in institution B report', async () => {
    const engine = new ComplianceRuleEngine();
    const [resultA, resultB] = await Promise.all([
      engine.evaluateInstitution('inst_A', ['gdpr']),
      engine.evaluateInstitution('inst_B', ['gdpr']),
    ]);

    expect(resultA.institutionId).toBe('inst_A');
    expect(resultB.institutionId).toBe('inst_B');

    // Evidence must be scoped — no cross-tenant leakage
    for (const finding of resultA.findings) {
      expect(finding.evidence).not.toContain('inst_B');
    }
    for (const finding of resultB.findings) {
      expect(finding.evidence).not.toContain('inst_A');
    }
  });

  test('Report Generator produces JSON format with required fields', async () => {
    const engine = new ComplianceRuleEngine();
    const result = await engine.evaluateInstitution('inst_e2e', ['soc2']);
    const generator = new ComplianceReportGenerator();
    const report = generator.generate(result.findings, 'json');

    expect(report).toHaveProperty('generatedAt');
    expect(report).toHaveProperty('findings');
    expect(report).toHaveProperty('totalFindings');
    expect(report).toHaveProperty('requiresHumanReview');
  });

  test('Findings for all 5 frameworks are returned', async () => {
    const engine = new ComplianceRuleEngine();
    const result = await engine.evaluateInstitution('inst_multi', [
      'gdpr', 'hipaa', 'soc2', 'ferpa', 'malaysia-education'
    ]);

    const frameworks = new Set(result.findings.map((f) => f.framework));
    expect(frameworks.size).toBe(5);
  });
});