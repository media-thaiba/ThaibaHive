import { confidenceGate } from '@/lib/security/soar/confidence-gate';
import { SecurityPlaybook } from '@/lib/security/soar/soar-types';

describe('ConfidenceGate', () => {
  const normalPlaybook: SecurityPlaybook = {
    id: 'pb-normal',
    name: 'Normal Playbook',
    version: '1.0.0',
    category: 'NETWORK',
    enabled: true,
    auto_execute: true,
    min_confidence: 80,
    triggers: [],
    steps: [],
  };

  const highImpactPlaybook: SecurityPlaybook = {
    id: 'pb-high-impact',
    name: 'High Impact Playbook',
    version: '1.0.0',
    category: 'NETWORK',
    enabled: true,
    auto_execute: true,
    min_confidence: 80,
    high_impact: true,
    triggers: [],
    steps: [],
  };

  it('should route >= 80% confidence to AUTO_EXECUTE', () => {
    const res = confidenceGate.evaluate(85, normalPlaybook);
    expect(res.decision).toBe('AUTO_EXECUTE');
    expect(res.confidence).toBe(85);
  });

  it('should route 60-79% confidence to REQUIRE_APPROVAL', () => {
    const res = confidenceGate.evaluate(68, normalPlaybook);
    expect(res.decision).toBe('REQUIRE_APPROVAL');
  });

  it('should route < 60% confidence to LOG_ONLY', () => {
    const res = confidenceGate.evaluate(45, normalPlaybook);
    expect(res.decision).toBe('LOG_ONLY');
  });

  it('should mandate REQUIRE_APPROVAL for high_impact playbooks even at 100% confidence', () => {
    const res = confidenceGate.evaluate(100, highImpactPlaybook);
    expect(res.decision).toBe('REQUIRE_APPROVAL');
    expect(res.reason).toContain('high-impact');
  });

  it('should mandate REQUIRE_APPROVAL when auto_execute is false', () => {
    const disabledAutoExec = { ...normalPlaybook, auto_execute: false };
    const res = confidenceGate.evaluate(90, disabledAutoExec);
    expect(res.decision).toBe('REQUIRE_APPROVAL');
  });
});
