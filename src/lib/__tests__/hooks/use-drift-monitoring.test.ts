import { renderHook, waitFor, act } from '@testing-library/react';
import { useDriftMonitoring } from '@/lib/hooks/use-drift-monitoring';
import { useEdgeInference } from '@/lib/hooks/use-edge-inference';
import { useCampusBenchmarking } from '@/lib/hooks/use-campus-benchmarking';

describe('A-FED React Hooks Test Suite', () => {
  it('should fetch drift reports with useDriftMonitoring', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            reports: [
              {
                id: 'rep_1',
                modelId: 'm1',
                overallPsi: 0.12,
                maxFeatureKs: 0.08,
                retrainingTriggered: false,
              },
            ],
          }),
      } as any)
    );

    const { result } = renderHook(() => useDriftMonitoring('m1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reports.length).toBe(1);
    expect(result.current.reports[0].overallPsi).toBe(0.12);
  });

  it('should execute edge inference with useEdgeInference', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            result: {
              predictedClass: 1,
              confidence: 0.88,
              outputVector: [0.12, 0.88],
              executionEngine: 'quantized_int8',
              latencyMs: 1.2,
            },
          }),
      } as any)
    );

    const { result } = renderHook(() => useEdgeInference('m1'));

    await act(async () => {
      await result.current.predict([0.5, 0.2, 0.9]);
    });

    expect(result.current.prediction?.predictedClass).toBe(1);
    expect(result.current.prediction?.confidence).toBe(0.88);
  });

  it('should fetch cross-campus benchmarks with useCampusBenchmarking', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            benchmarks: [
              {
                campusId: 'campus_1',
                campusName: 'Tech Campus',
                overallRank: 1,
                indicators: { retentionRate: 94.2 },
              },
            ],
          }),
      } as any)
    );

    const { result } = renderHook(() => useCampusBenchmarking());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.benchmarks.length).toBe(1);
    expect(result.current.benchmarks[0].overallRank).toBe(1);
  });
});
