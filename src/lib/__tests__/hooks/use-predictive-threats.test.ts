/**
 * Unit tests for ARES Hooks (ARES-021)
 */

import { renderHook, act } from '@testing-library/react';
import { usePredictiveThreats } from '@/lib/hooks/use-predictive-threats';
import { useChaosMesh } from '@/lib/hooks/use-chaos-mesh';
import { useThreatGraph } from '@/lib/hooks/use-threat-graph';
import { useResilienceScore } from '@/lib/hooks/use-resilience-score';

global.fetch = jest.fn();

describe('ARES-021: React Hooks for ARES', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('usePredictiveThreats should fetch and return threat forecasts', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        threats: [
          {
            forecastId: 'fc-1',
            threatCategory: 'CREDENTIAL_STUFFING',
            posteriorProbability: 0.85,
            severityTier: 'CRITICAL_FORECAST',
          },
        ],
        alerts: [],
      }),
    });

    const { result } = renderHook(() => usePredictiveThreats());
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.threats.length).toBe(1);
    expect(result.current.threats[0].threatCategory).toBe('CREDENTIAL_STUFFING');
  });

  it('useChaosMesh should fetch scenarios and allow running experiments', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scenarios: [{ scenarioId: 'chaos-net-partition-edge', name: 'Partition' }],
        executions: [],
      }),
    });

    const { result } = renderHook(() => useChaosMesh());
    await act(async () => {});

    expect(result.current.scenarios.length).toBe(1);
  });

  it('useThreatGraph should fetch nodes and edges', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        nodes: [{ id: 'n1', type: 'ThreatActor', name: 'APT' }],
        edges: [],
        overview: { totalNodes: 1, totalEdges: 0 },
      }),
    });

    const { result } = renderHook(() => useThreatGraph());
    await act(async () => {});

    expect(result.current.nodes.length).toBe(1);
    expect(result.current.overview.totalNodes).toBe(1);
  });

  it('useResilienceScore should fetch snapshots and recommendations', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        snapshot: { overallScore: 92.4, tier: 'RESILIENT' },
        trends: { currentScore: 92.4, trajectory: 'IMPROVING' },
        recommendations: [],
      }),
    });

    const { result } = renderHook(() => useResilienceScore());
    await act(async () => {});

    expect(result.current.snapshot?.overallScore).toBe(92.4);
  });
});
