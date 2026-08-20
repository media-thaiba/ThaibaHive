import { renderHook, act } from '@testing-library/react';
import { useFederatedTraining } from '@/lib/hooks/use-federated-training';

describe('useFederatedTraining hook', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url: any) => {
      if (url.includes('/train')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              roundNumber: 1,
              globalLoss: 0.25,
              globalAccuracy: 0.92,
              participantsCount: 4,
              checksum: 'abc123chk',
            }),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ trainingRounds: [] }),
      } as any);
    });
  });

  it('should initialize and trigger federated training rounds', async () => {
    const { result } = renderHook(() => useFederatedTraining('model_1'));

    await act(async () => {
      await result.current.triggerRound(1, 'FedAvg', [
        { nodeId: 'node_1', weights: [0.1, 0.2], sampleCount: 100 },
      ]);
    });

    expect(result.current.rounds.length).toBe(1);
    expect(result.current.rounds[0].globalAccuracy).toBe(0.92);
  });
});
