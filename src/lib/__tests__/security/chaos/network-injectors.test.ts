/**
 * Unit tests for Chaos Network & Security Injectors (ARES-006 & ARES-007)
 */

import {
  NetworkPartitionInjector,
  PacketCorruptionInjector,
  LatencyInjector,
  ServiceDegradationInjector,
  CaCompromiseInjector,
  TokenReplayInjector,
  SplitBrainInjector,
} from '@/lib/security/chaos/injectors';

describe('ARES-006 & ARES-007: Chaos Injectors', () => {
  const mockTarget = { targetType: 'SERVICE' as const, targetIdentifier: 'auth-service-1', blastRadiusPercentage: 20 };

  it('should inject and revert network partition', async () => {
    const injector = new NetworkPartitionInjector();
    expect(injector.isFaultActive(mockTarget)).toBe(false);

    await injector.inject(mockTarget, {});
    expect(injector.isFaultActive(mockTarget)).toBe(true);

    await injector.revert(mockTarget);
    expect(injector.isFaultActive(mockTarget)).toBe(false);
  });

  it('should inject and revert latency delays', async () => {
    const injector = new LatencyInjector();
    await injector.inject(mockTarget, { minDelayMs: 150, maxDelayMs: 300 });

    expect(injector.isFaultActive(mockTarget)).toBe(true);
    const delay = injector.getInjectedDelayMs(mockTarget);
    expect(delay).toBeGreaterThanOrEqual(150);
    expect(delay).toBeLessThanOrEqual(300);

    await injector.revert(mockTarget);
    expect(injector.isFaultActive(mockTarget)).toBe(false);
    expect(injector.getInjectedDelayMs(mockTarget)).toBe(0);
  });

  it('should inject and revert security faults (CA compromise & Split-brain)', async () => {
    const caInjector = new CaCompromiseInjector();
    const splitBrainInjector = new SplitBrainInjector();

    await caInjector.inject(mockTarget, {});
    expect(caInjector.isFaultActive(mockTarget)).toBe(true);
    await caInjector.revert(mockTarget);
    expect(caInjector.isFaultActive(mockTarget)).toBe(false);

    await splitBrainInjector.inject(mockTarget, { replicationLagMs: 4000 });
    expect(splitBrainInjector.isFaultActive(mockTarget)).toBe(true);
    await splitBrainInjector.revert(mockTarget);
    expect(splitBrainInjector.isFaultActive(mockTarget)).toBe(false);
  });
});
