import { renderHook, act, waitFor } from '@testing-library/react';
import { useCampusEnergy } from '@/lib/hooks/use-campus-energy';
import { useFleetLogistics } from '@/lib/hooks/use-fleet-logistics';
import { useBiometricAttendance } from '@/lib/hooks/use-biometric-attendance';
import { useCloudSustainability } from '@/lib/hooks/use-cloud-sustainability';
import { useResourceMesh } from '@/lib/hooks/use-resource-mesh';

describe('AIMS-022 — Client React Hooks', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/admin/operations/energy/hvac')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ optimizations: [{ id: 'opt_1' }], summary: { totalSavedKwh: 100 } }),
        });
      }
      if (urlStr.includes('/api/admin/operations/fleet/dispatches')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ dispatches: [{ routeId: 'r_1' }], activeCount: 1 }),
        });
      }
      if (urlStr.includes('/api/admin/operations/biometrics/attendance')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ logs: [{ id: 'log_1' }], totalCount: 1 }),
        });
      }
      if (urlStr.includes('/api/admin/operations/cloud/cost')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resources: [], recommendations: [], totalEstimatedSavingsDollars: 500 }),
        });
      }
      if (urlStr.includes('/api/admin/operations/sustainability/carbon')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ esgReport: { reportingPeriod: '2026-Q3' }, emissions: {}, initiatives: [] }),
        });
      }
      if (urlStr.includes('/api/admin/operations/mesh/resources')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ resources: [{ resourceId: 'res_1' }], crossCampusRecommendations: [] }),
        });
      }
      return Promise.reject(new Error('Unknown URL in mock'));
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should manage campus energy optimization state', async () => {
    const { result } = renderHook(() => useCampusEnergy({ pollingIntervalMs: 60000 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.optimizations.length).toBe(1);
    expect(result.current.summary.totalSavedKwh).toBe(100);
  });

  it('should manage fleet logistics state', async () => {
    const { result } = renderHook(() => useFleetLogistics('campus_main', 60000));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dispatches.length).toBe(1);
    expect(result.current.activeCount).toBe(1);
  });

  it('should manage biometric attendance logs state', async () => {
    const { result } = renderHook(() => useBiometricAttendance());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.logs.length).toBe(1);
  });

  it('should manage cloud sustainability and ESG reports state', async () => {
    const { result } = renderHook(() => useCloudSustainability('campus_main'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cloudData.totalEstimatedSavingsDollars).toBe(500);
    expect(result.current.carbonData.esgReport.reportingPeriod).toBe('2026-Q3');
  });

  it('should manage cross-campus resource mesh state', async () => {
    const { result } = renderHook(() => useResourceMesh('campus_main'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.resources.length).toBe(1);
  });
});
