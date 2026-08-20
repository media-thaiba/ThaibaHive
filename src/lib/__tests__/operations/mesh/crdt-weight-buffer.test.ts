import { CrdtWeightBuffer } from '@/lib/operations/mesh/crdt-weight-buffer';
import { WeightReconciliation } from '@/lib/operations/mesh/weight-reconciliation';
import { TopKSparsifier } from '@/lib/operations/mesh/topk-sparsifier';
import { GradientCompressor } from '@/lib/operations/mesh/gradient-compressor';

describe('Mesh CRDT Buffer, Reconciliation & Compression Pipeline', () => {
  it('should buffer CRDT updates and reconcile partitioned branches', () => {
    const buffer = new CrdtWeightBuffer();

    buffer.addUpdate({
      modelId: 'm1',
      roundNumber: 1,
      originNodeId: 'node_east',
      weights: [1.0, 2.0, 3.0],
      vectorClock: { node_east: 1 },
      timestamp: new Date().toISOString(),
    });

    buffer.addUpdate({
      modelId: 'm1',
      roundNumber: 1,
      originNodeId: 'node_west',
      weights: [3.0, 4.0, 5.0],
      vectorClock: { node_west: 1 },
      timestamp: new Date().toISOString(),
    });

    const roundEntries = buffer.getUpdatesForRound('m1', 1);
    expect(roundEntries.length).toBe(2);

    const reconciled = WeightReconciliation.reconcile(roundEntries);
    expect(reconciled).toEqual([2.0, 3.0, 4.0]);
  });

  it('should sparsify and reconstruct gradient vectors using Top-K', () => {
    const raw = [0.01, 0.95, -0.88, 0.02, 0.001, 0.55];
    const sparse = TopKSparsifier.sparsify(raw, 0.5); // Top 3

    expect(sparse.sparseIndices.length).toBe(3);
    expect(sparse.sparseIndices).toEqual([1, 2, 5]); // indices of 0.95, -0.88, 0.55

    const desparsified = TopKSparsifier.desparsify(sparse);
    expect(desparsified[1]).toBeCloseTo(0.95, 4);
    expect(desparsified[0]).toBe(0); // Zeroed out
  });

  it('should compress and decompress gradient updates with Error Feedback', () => {
    const compressor = new GradientCompressor();
    const raw = [0.01, 0.85, -0.75, 0.02, 0.60, 0.05, 0.02, 0.03, 0.01, 0.02];

    const compressed = compressor.compress('node_1', raw, 0.3); // Top 30%
    expect(compressed.quantizedValues.length).toBe(3);
    expect(compressed.scaleFactor).toBeGreaterThan(0);

    const decompressed = compressor.decompress(compressed);
    expect(decompressed.length).toBe(10);
    expect(decompressed[1]).toBeCloseTo(0.85, 1);
  });
});
