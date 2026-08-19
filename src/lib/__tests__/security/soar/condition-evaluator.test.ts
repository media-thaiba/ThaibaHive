import { ConditionEvaluator } from '@/lib/security/soar/condition-evaluator';

describe('ConditionEvaluator', () => {
  const context = {
    trigger: {
      confidence: 85,
      severity: 'HIGH',
      ip: '192.168.1.100',
      tags: ['botnet', 'c2'],
      source: 'TAXII_FEED_ABUSEIPDB',
    },
    target: {
      type: 'IP',
      value: '192.168.1.100',
    },
  };

  it('should evaluate equality and inequality operators', () => {
    expect(ConditionEvaluator.evaluate({ field: 'trigger.severity', operator: '==', value: 'HIGH' }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.severity', operator: '!=', value: 'LOW' }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.severity', operator: '==', value: 'LOW' }, context)).toBe(false);
  });

  it('should evaluate relational numeric operators', () => {
    expect(ConditionEvaluator.evaluate({ field: 'trigger.confidence', operator: '>=', value: 80 }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.confidence', operator: '>', value: 85 }, context)).toBe(false);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.confidence', operator: '<=', value: 90 }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.confidence', operator: '<', value: 50 }, context)).toBe(false);
  });

  it('should evaluate in and not_in operators', () => {
    expect(ConditionEvaluator.evaluate({ field: 'trigger.severity', operator: 'in', value: ['HIGH', 'CRITICAL'] }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.severity', operator: 'not_in', value: ['LOW', 'INFO'] }, context)).toBe(true);
  });

  it('should evaluate regex_match and contains operators', () => {
    expect(ConditionEvaluator.evaluate({ field: 'trigger.source', operator: 'contains', value: 'ABUSEIPDB' }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.ip', operator: 'regex_match', value: '^192\\.168\\.' }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.ip', operator: 'regex_match', value: '^10\\.' }, context)).toBe(false);
  });

  it('should evaluate cidr_match operator', () => {
    expect(ConditionEvaluator.evaluate({ field: 'trigger.ip', operator: 'cidr_match', value: '192.168.0.0/16' }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.ip', operator: 'cidr_match', value: '192.168.1.0/24' }, context)).toBe(true);
    expect(ConditionEvaluator.evaluate({ field: 'trigger.ip', operator: 'cidr_match', value: '10.0.0.0/8' }, context)).toBe(false);
  });

  it('should evaluate compound AND, OR, NOT groups', () => {
    const andGroup = {
      and: [
        { field: 'trigger.confidence', operator: '>=' as const, value: 80 },
        { field: 'trigger.severity', operator: '==' as const, value: 'HIGH' },
      ],
    };
    expect(ConditionEvaluator.evaluate(andGroup, context)).toBe(true);

    const orGroup = {
      or: [
        { field: 'trigger.severity', operator: '==' as const, value: 'LOW' },
        { field: 'trigger.confidence', operator: '>=' as const, value: 80 },
      ],
    };
    expect(ConditionEvaluator.evaluate(orGroup, context)).toBe(true);

    const notGroup = {
      not: { field: 'trigger.severity', operator: '==' as const, value: 'LOW' },
    };
    expect(ConditionEvaluator.evaluate(notGroup, context)).toBe(true);
  });
});
