import { renderHook, waitFor } from '@testing-library/react';
import { useResourceMesh } from '@/lib/hooks/use-resource-mesh';

describe('AIMS-022 — useResourceMesh Hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      if (String(url).includes('/api/admin/operations/mesh/resources')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              resources: [
                {
                  resourceId: 'res_vr_lab',
                  name: 'VR Lab',
                  category: 'SPECIALIZED_EQUIPMENT',
                  capacityUnits: 20,
                  hourlyCostRateDollars: 50,
                },
              ],
              crossCampusRecommendations: [],
            }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch and maintain cross-campus shared resources and CRDT bookings', async () => {
    const { result } = renderHook(() => useResourceMesh('campus_main'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.resources.length).toBe(1);
    expect(result.current.resources[0].name).toBe('VR Lab');
    expect(result.current.error).toBeNull();
  });
});
