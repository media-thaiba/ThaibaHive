import { renderHook, waitFor } from '@testing-library/react';
import { useCampusEnergy } from '@/lib/hooks/use-campus-energy';

describe('AIMS-022 — useCampusEnergy Hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      if (String(url).includes('/api/admin/operations/energy/hvac')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              optimizations: [
                {
                  id: 'opt_1',
                  campusId: 'campus_main',
                  buildingId: 'bld_sci',
                  zoneId: 'zone_101',
                  baselineTempCelsius: 21,
                  optimizedSetpointCelsius: 23,
                  projectedKwhSavings: 15.4,
                },
              ],
              summary: { totalSavedKwh: 15.4, totalCostSavedDollars: 2.15 },
            }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch and maintain real-time HVAC energy optimization state', async () => {
    const { result } = renderHook(() => useCampusEnergy({ pollingIntervalMs: 60000 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.optimizations.length).toBe(1);
    expect(result.current.summary.totalSavedKwh).toBe(15.4);
    expect(result.current.error).toBeNull();
  });
});
