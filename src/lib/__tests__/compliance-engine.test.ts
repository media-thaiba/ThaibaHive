import { RuleParser } from '../compliance/rule-parser';
import { ComplianceRuleEngine } from '../compliance/compliance-rule-engine';
import { AuditTrailCollector } from '../compliance/audit-trail-collector';
import { ComplianceReportGenerator } from '../compliance/compliance-report-generator';
import { ComplianceFinding } from '../compliance/compliance-rule-engine';

describe('Compliance Intelligence Engine', () => {
  test('Rule Parser loads GDPR rules', () => {
    const parser = new RuleParser();
    const rules = parser.loadFramework('gdpr');
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toHaveProperty('id');
    expect(rules[0]).toHaveProperty('severity');
    expect(rules[0]).toHaveProperty('remediationGuidance');
  });

  test('Rule Parser loads all 5 framework rule sets', () => {
    const parser = new RuleParser();
    const frameworks = ['gdpr', 'hipaa', 'soc2', 'ferpa', 'malaysia-education'];
    for (const fw of frameworks) {
      const rules = parser.loadFramework(fw);
      expect(rules.length).toBeGreaterThanOrEqual(5);
    }
  });

  test('Engine evaluateInstitution returns EvaluationResult for multiple frameworks', async () => {
    const engine = new ComplianceRuleEngine();
    const result = await engine.evaluateInstitution('inst_001', ['gdpr', 'soc2']);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.institutionId).toBe('inst_001');
    expect(result.frameworksEvaluated).toContain('gdpr');
    expect(result.frameworksEvaluated).toContain('soc2');
    expect(typeof result.requiresHumanReview).toBe('boolean');
  });

  test('Cross-tenant isolation: institution A results do not leak into institution B', async () => {
    const engine = new ComplianceRuleEngine();
    const resultA = await engine.evaluateInstitution('inst_A', ['gdpr']);
    const resultB = await engine.evaluateInstitution('inst_B', ['gdpr']);
    // Each result is scoped to its own institutionId
    expect(resultA.institutionId).toBe('inst_A');
    expect(resultB.institutionId).toBe('inst_B');
    // Evidence strings must be scoped to the correct institution
    for (const finding of resultA.findings) {
      expect(finding.evidence).toContain('inst_A');
      expect(finding.evidence).not.toContain('inst_B');
    }
  });

  test('Audit Trail collection returns AuditTrailDocument', async () => {
    const collector = new AuditTrailCollector();
    const trail = await collector.collect('inst_001', '2026-01-01', '2026-12-31');
    expect(trail).toHaveProperty('institutionId', 'inst_001');
    expect(trail).toHaveProperty('events');
    expect(Array.isArray(trail.events)).toBe(true);
  });

  test('Report Generator flags critical findings for human review', () => {
    const gen = new ComplianceReportGenerator();
    const findings: ComplianceFinding[] = [
      { ruleId: 'GDPR-001', framework: 'gdpr', status: 'fail', evidence: 'inst_001', severity: 'critical', remediationGuidance: 'Review data handling' },
      { ruleId: 'SOC2-001', framework: 'soc2', status: 'pass', evidence: 'inst_001', severity: 'high', remediationGuidance: 'Maintain audit logs' },
    ];
    const report = gen.generate(findings, 'json');
    expect(report.requiresHumanReview).toBe(true);
  });

  test('Report Generator does not flag non-critical findings', () => {
    const gen = new ComplianceReportGenerator();
    const findings: ComplianceFinding[] = [
      { ruleId: 'SOC2-001', framework: 'soc2', status: 'pass', evidence: 'inst_001', severity: 'high', remediationGuidance: '' },
      { ruleId: 'SOC2-002', framework: 'soc2', status: 'warn', evidence: 'inst_001', severity: 'medium', remediationGuidance: '' },
    ];
    const report = gen.generate(findings, 'json');
    expect(report.requiresHumanReview).toBe(false);
  });
});