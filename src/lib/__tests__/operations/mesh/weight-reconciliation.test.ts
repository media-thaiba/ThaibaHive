import { WeightReconciliation } from '@/lib/operations/mesh/weight-reconciliation';
import { CrdtWeightEntry } from '@/lib/operations/mesh/crdt-weight-buffer';

describe('WeightReconciliation (Vector Clock CRDT Resolution)', () => {
  it('should reconcile divergent branch model weights after network partition healing', () => {
    const entryA: CrdtWeightEntry = {
      modelId: 'm1',
      roundNumber: 2,
      originNodeId: 'node_1',
      weights: [1.0, 2.0, 3.0],
      vectorClock: { node_1: 2, node_2: 1 },
      timestamp: '2026-08-20T10:00:00Z',
    };

    const entryB: CrdtWeightEntry = {
      modelId: 'm1',
      roundNumber: 2,
      originNodeId: 'node_2',
      weights: [3.0, 4.0, 5.0],
      vectorClock: { node_1: 1, node_2: 2 },
      timestamp: '2026-08-20T10:05:00Z',
    };

    const reconciled = WeightReconciliation.reconcile([entryA, entryB]);
    expect(reconciled).toEqual([2.0, 3.0, 4.0]);
  });
});
