import { renderHook, act } from '@testing-library/react';
import { useSoarOrchestration } from '@/lib/hooks/use-soar-orchestration';

// Mock fetchWithDPoP
jest.mock('@/lib/api-client', () => ({
  fetchWithDPoP: jest.fn().mockImplementation((url: string) => {
    if (url.includes('/playbooks')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ playbooks: [{ id: 'pb-1', name: 'Test Playbook' }] }),
      });
    }
    if (url.includes('/executions')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ active: [], history: [{ execution_id: 'exec-1' }] }),
      });
    }
    if (url.includes('/approvals')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ approvals: [{ id: 'appr-1' }] }),
      });
    }
    if (url.includes('/metrics')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          metrics: {
            totalExecutions: 5,
            totalActions: 10,
            pendingApprovals: 1,
            totalCompensations: 0,
            avgExecutionDurationSeconds: 1.2,
            engineEnabled: true,
          },
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
  }),
}));

describe('useSoarOrchestration Hook', () => {
  it('should initialize and load SOAR state', async () => {
    const { result } = renderHook(() => useSoarOrchestration());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.playbooks).toHaveLength(1);
    expect(result.current.executionHistory).toHaveLength(1);
    expect(result.current.pendingApprovals).toHaveLength(1);
    expect(result.current.metrics.totalExecutions).toBe(5);
  });
});
