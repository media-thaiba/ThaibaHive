import { ContextInterpolator } from '@/lib/security/soar/context-interpolator';

describe('ContextInterpolator', () => {
  const context = {
    trigger: {
      ip: '203.0.113.50',
      user_id: 'usr_849204',
      confidence: 95,
      metadata: {
        country: 'US',
      },
    },
    target: {
      type: 'IP',
      value: '203.0.113.50',
    },
    steps: {
      step_1: {
        output: {
          waf_rule_id: 'rule_cf_9981',
          success: true,
        },
      },
    },
  };

  it('should interpolate exact matches retaining raw types', () => {
    const rawNumber = ContextInterpolator.interpolate('{{trigger.confidence}}', context);
    expect(rawNumber).toBe(95);

    const rawBool = ContextInterpolator.interpolate('{{steps.step_1.output.success}}', context);
    expect(rawBool).toBe(true);
  });

  it('should interpolate strings with multiple embedded tokens', () => {
    const message = ContextInterpolator.interpolate(
      'Blocked IP {{trigger.ip}} for user {{trigger.user_id}} via rule {{steps.step_1.output.waf_rule_id}}',
      context
    );
    expect(message).toBe('Blocked IP 203.0.113.50 for user usr_849204 via rule rule_cf_9981');
  });

  it('should recursively interpolate nested objects and arrays', () => {
    const params = {
      ip: '{{trigger.ip}}',
      tags: ['alert', 'ip:{{trigger.ip}}'],
      nested: {
        rule: '{{steps.step_1.output.waf_rule_id}}',
        score: '{{trigger.confidence}}',
      },
    };

    const interpolated = ContextInterpolator.interpolate(params, context);
    expect(interpolated).toEqual({
      ip: '203.0.113.50',
      tags: ['alert', 'ip:203.0.113.50'],
      nested: {
        rule: 'rule_cf_9981',
        score: 95,
      },
    });
  });
});
