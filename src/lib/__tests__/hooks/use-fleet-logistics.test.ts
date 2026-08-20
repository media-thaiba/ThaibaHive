import { renderHook, waitFor } from '@testing-library/react';
import { useFleetLogistics } from '@/lib/hooks/use-fleet-logistics';

describe('AIMS-022 — useFleetLogistics Hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      if (String(url).includes('/api/admin/operations/fleet/dispatches')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              dispatches: [
                {
                  routeId: 'r_101',
                  vehicleId: 'shuttle_1',
                  totalDistanceKm: 12.5,
                  totalDurationMinutes: 25,
                  status: 'ACTIVE',
                },
              ],
              activeCount: 1,
            }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch and maintain fleet dispatches and active routes count', async () => {
    const { result } = renderHook(() => useFleetLogistics('campus_main', 60000));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.dispatches.length).toBe(1);
    expect(result.current.activeCount).toBe(1);
    expect(result.current.error).toBeNull();
  });
});
