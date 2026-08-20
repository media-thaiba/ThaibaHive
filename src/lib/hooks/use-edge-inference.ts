import { useState, useCallback } from 'react';

export interface InferencePrediction {
  predictedClass: number;
  confidence: number;
  outputVector: number[];
  executionEngine: 'onnx_wasm' | 'quantized_int8' | 'cloud_fallback';
  latencyMs: number;
}

export function useEdgeInference(modelId: string) {
  const [prediction, setPrediction] = useState<InferencePrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(
    async (inputVector: number[]) => {
      setIsPredicting(true);
      setError(null);
      try {
        const res = await fetch('/api/operations/federated/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, inputVector }),
        });
        if (!res.ok) throw new Error('Inference evaluation failed');
        const data = await res.json();
        setPrediction(data.result);
        return data.result;
      } catch (err: any) {
        setError(err.message || 'Inference error');
        throw err;
      } finally {
        setIsPredicting(false);
      }
    },
    [modelId]
  );

  return {
    prediction,
    isPredicting,
    error,
    predict,
  };
}
