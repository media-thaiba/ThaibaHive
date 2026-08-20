import { useState, useEffect, useCallback } from 'react';

export interface TrainingRoundResult {
  roundNumber: number;
  globalLoss: number;
  globalAccuracy: number;
  participantsCount: number;
  checksum: string;
}

export function useFederatedTraining(modelId?: string) {
  const [rounds, setRounds] = useState<TrainingRoundResult[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainingHistory = useCallback(async () => {
    if (!modelId) return;
    try {
      const res = await fetch(`/api/operations/federated/models/${modelId}`);
      if (!res.ok) throw new Error('Failed to fetch model training history');
      const data = await res.json();
      setRounds(data.trainingRounds || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch history');
    }
  }, [modelId]);

  useEffect(() => {
    fetchTrainingHistory().catch(() => {});
  }, [fetchTrainingHistory]);

  const triggerRound = useCallback(
    async (roundNumber: number, algorithm: 'FedAvg' | 'FedProx' = 'FedAvg', clientUpdates: any[]) => {
      if (!modelId) return;
      setIsTraining(true);
      setError(null);
      try {
        const res = await fetch('/api/operations/federated/train', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId,
            roundNumber,
            algorithm,
            clientUpdates,
          }),
        });
        if (!res.ok) throw new Error('Round aggregation failed');
        const data = await res.json();
        setRounds((prev) => [...prev, data]);
        return data;
      } catch (err: any) {
        setError(err.message || 'Round execution failed');
        throw err;
      } finally {
        setIsTraining(false);
      }
    },
    [modelId]
  );

  return {
    rounds,
    isTraining,
    error,
    triggerRound,
    refetch: fetchTrainingHistory,
  };
}
