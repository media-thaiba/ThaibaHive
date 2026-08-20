import { renderHook, waitFor } from '@testing-library/react';
import { useBiometricAttendance } from '@/lib/hooks/use-biometric-attendance';

describe('AIMS-022 — useBiometricAttendance Hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      if (String(url).includes('/api/admin/operations/biometrics/attendance')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              logs: [
                {
                  id: 'bio_1',
                  userId: 'student_99',
                  locationName: 'North Gate Kiosk',
                  verificationMethod: 'EDGE_NEURAL_ZKP',
                  syncStatus: 'SYNCED',
                },
              ],
              totalCount: 1,
            }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    }) as any;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should fetch and maintain edge biometric attendance logs and ZKP attestations', async () => {
    const { result } = renderHook(() => useBiometricAttendance());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.logs.length).toBe(1);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.error).toBeNull();
  });
});
