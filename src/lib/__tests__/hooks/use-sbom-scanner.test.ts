import { renderHook, waitFor } from '@testing-library/react';
import { useSbomScanner } from '@/lib/hooks/use-sbom-scanner';

describe('useSbomScanner', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/sbom/scan')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, scanResult: { criticalCount: 1 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ vulnerabilities: [{ id: 'v1', cveId: 'CVE-2026-1' }] }),
      });
    });
  });

  it('fetches vulnerabilities on mount', async () => {
    const { result } = renderHook(() => useSbomScanner());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.vulnerabilities).toHaveLength(1);
  });
});
