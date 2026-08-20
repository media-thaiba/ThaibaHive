/**
 * Unit tests for Chaos Safety Guardrails & KillSwitch (ARES-008)
 */

import { SafetyGuardrails } from '@/lib/security/chaos/safety-guardrails';
import { ChaosKillSwitch } from '@/lib/security/chaos/kill-switch';

describe('ARES-008: SafetyGuardrails & ChaosKillSwitch', () => {
  beforeEach(() => {
    ChaosKillSwitch.resetInstance();
  });

  it('should detect breach when error rate exceeds threshold', () => {
    const guardrails = SafetyGuardrails.getInstance();
    const result = guardrails.checkHealth({
      errorRatePercent: 2.5,
      p99LatencyMs: 300,
      unhandledExceptionCount: 0,
      activeRequests: 50,
    });

    expect(result.isSafe).toBe(false);
    expect(result.breachReason).toContain('Error rate');
  });

  it('should detect breach when P99 latency exceeds threshold', () => {
    const guardrails = SafetyGuardrails.getInstance();
    const result = guardrails.checkHealth({
      errorRatePercent: 0.1,
      p99LatencyMs: 1400,
      unhandledExceptionCount: 0,
      activeRequests: 50,
    });

    expect(result.isSafe).toBe(false);
    expect(result.breachReason).toContain('P99 Latency');
  });

  it('should trip kill-switch in < 100ms and execute registered revert callbacks', async () => {
    const killSwitch = ChaosKillSwitch.getInstance();
    let callbackExecuted = false;

    killSwitch.registerRevertCallback(async () => {
      callbackExecuted = true;
    });

    const event = await killSwitch.trip('Emergency spike detected');
    expect(event.revertedInjectorsCount).toBe(1);
    expect(event.durationMs).toBeLessThan(100);
    expect(callbackExecuted).toBe(true);
    expect(killSwitch.isEmergencyTripped()).toBe(true);
  });
});
