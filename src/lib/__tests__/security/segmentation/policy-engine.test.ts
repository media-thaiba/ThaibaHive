import { PolicyEngine } from '@/lib/security/segmentation/policy-engine';
import { TrafficEvaluationRequest } from '@/lib/security/segmentation/segmentation-types';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    PolicyEngine.resetInstance();
    engine = PolicyEngine.getInstance();
  });

  it('allows high-trust traffic with prod VLAN assignment', () => {
    const request: TrafficEvaluationRequest = {
      sourceIp: '10.0.1.15',
      trustTier: 'HIGH_TRUST',
      targetService: 'academic-service',
      destPort: 443,
      protocol: 'TCP',
    };

    const result = engine.evaluateTraffic(request);
    expect(result.allowed).toBe(true);
    expect(result.action).toBe('ALLOW');
    expect(result.vlanAssignment).toBe(10);
  });

  it('quarantines untrusted device traffic to isolated VLAN 99', () => {
    const request: TrafficEvaluationRequest = {
      sourceIp: '192.168.1.99',
      trustTier: 'UNTRUSTED',
      targetService: 'finance-service',
      destPort: 443,
      protocol: 'TCP',
    };

    const result = engine.evaluateTraffic(request);
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('QUARANTINE');
    expect(result.vlanAssignment).toBe(99);
  });

  it('requires step-up auth for low-trust devices', () => {
    const request: TrafficEvaluationRequest = {
      sourceIp: '10.0.2.10',
      trustTier: 'LOW_TRUST',
      targetService: 'portal',
      destPort: 443,
      protocol: 'TCP',
    };

    const result = engine.evaluateTraffic(request);
    expect(result.allowed).toBe(false);
    expect(result.action).toBe('STEP_UP_AUTH');
    expect(result.vlanAssignment).toBe(30);
  });
});
