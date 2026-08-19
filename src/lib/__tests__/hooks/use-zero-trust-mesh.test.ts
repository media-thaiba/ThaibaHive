import { renderHook, act, waitFor } from '@testing-library/react';
import { useZeroTrustMesh } from '@/lib/hooks/use-zero-trust-mesh';

describe('useZeroTrustMesh', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/devices')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ devices: [{ id: 'd1', deviceId: 'dev-1', score: 90 }] }),
        });
      }
      if (url.includes('/policies')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ policies: [{ id: 'p1', name: 'Pol 1' }] }),
        });
      }
      if (url.includes('/certificates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ certificates: [{ serialNumber: 'S1', serviceName: 'svc-1' }] }),
        });
      }
      if (url.includes('/metrics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ summary: { totalMtlsHandshakes: 5 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  it('fetches and sets zero-trust state on mount', async () => {
    const { result } = renderHook(() => useZeroTrustMesh());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.devices).toHaveLength(1);
    expect(result.current.policies).toHaveLength(1);
    expect(result.current.certificates).toHaveLength(1);
    expect(result.current.metrics.totalMtlsHandshakes).toBe(5);
  });
});
