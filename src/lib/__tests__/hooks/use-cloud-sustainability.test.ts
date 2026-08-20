import { renderHook, waitFor } from '@testing-library/react';
import { useCloudSustainability } from '@/lib/hooks/use-cloud-sustainability';

describe('AIMS-022 — useCloudSustainability Hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/admin/operations/cloud/cost')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              resources: [{ resourceId: 'i-1' }],
              recommendations: [{ resourceId: 'i-1', actionRequired: 'DOWNSCALE' }],
              totalEstimatedSavingsDollars: 450,
            }),
        });
      }
      if (urlStr.includes('/api/admin/operations/sustainability/carbon')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              esgReport: { reportingPeriod: '2026-Q3', verifiedGRICompliant: true },
              emissions: { totalKgCo2e: 4500 },
              initiatives: [],
            }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch and maintain multi-cloud cost rightsizing and GRI 305 ESG metrics', async () => {
    const { result } = renderHook(() => useCloudSustainability('campus_main'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.cloudData.totalEstimatedSavingsDollars).toBe(450);
    expect(result.current.carbonData.esgReport.verifiedGRICompliant).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
