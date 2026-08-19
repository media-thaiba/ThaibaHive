import { distributedLock } from '@/lib/security/soar/distributed-lock';

describe('DistributedLock', () => {
  beforeEach(() => {
    distributedLock.clear();
  });

  it('should successfully acquire and release a distributed lock', async () => {
    const handle = await distributedLock.acquire('lock:test:ip:10.0.0.1', { ttlMs: 5000 });
    expect(handle).not.toBeNull();
    expect(handle?.resource).toBe('lock:test:ip:10.0.0.1');
    expect(distributedLock.isLocked('lock:test:ip:10.0.0.1')).toBe(true);

    const released = await distributedLock.release(handle!);
    expect(released).toBe(true);
    expect(distributedLock.isLocked('lock:test:ip:10.0.0.1')).toBe(false);
  });

  it('should prevent concurrent acquisition of the same resource', async () => {
    const handle1 = await distributedLock.acquire('lock:test:user:42');
    expect(handle1).not.toBeNull();

    // Second acquisition attempt should return null (busy)
    const handle2 = await distributedLock.acquire('lock:test:user:42');
    expect(handle2).toBeNull();

    // After release, handle3 should succeed
    await distributedLock.release(handle1!);
    const handle3 = await distributedLock.acquire('lock:test:user:42');
    expect(handle3).not.toBeNull();
  });

  it('should auto-expire lock after TTL', async () => {
    const handle = await distributedLock.acquire('lock:test:short-ttl', { ttlMs: 20 });
    expect(handle).not.toBeNull();
    expect(distributedLock.isLocked('lock:test:short-ttl')).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 30));
    expect(distributedLock.isLocked('lock:test:short-ttl')).toBe(false);
  });
});
