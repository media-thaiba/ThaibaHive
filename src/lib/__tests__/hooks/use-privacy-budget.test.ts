import { renderHook, waitFor } from '@testing-library/react';
import { usePrivacyBudget } from '@/lib/hooks/use-privacy-budget';

describe('usePrivacyBudget hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            budget: {
              tenantId: 'campus_1',
              totalBudgetEpsilon: 10.0,
              consumedEpsilon: 2.5,
              remainingEpsilon: 7.5,
              isExhausted: false,
            },
          }),
      } as any)
    );
  });

  it('should fetch and provide privacy budget status', async () => {
    const { result } = renderHook(() => usePrivacyBudget('campus_1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.budget?.consumedEpsilon).toBe(2.5);
    expect(result.current.budget?.remainingEpsilon).toBe(7.5);
  });
});
