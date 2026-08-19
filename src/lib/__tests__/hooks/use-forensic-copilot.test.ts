import { renderHook, waitFor } from '@testing-library/react';
import { useForensicCopilot } from '@/lib/hooks/use-forensic-copilot';

describe('useForensicCopilot', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            reports: [
              {
                reportId: 'r1',
                incidentId: 'inc-1',
                primaryActor: 'user-01',
                executiveSummary: 'Detected threat',
              },
            ],
          }),
      });
    });
  });

  it('fetches forensic reports on mount', async () => {
    const { result } = renderHook(() => useForensicCopilot());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reports).toHaveLength(1);
    expect(result.current.reports[0].primaryActor).toBe('user-01');
  });
});
