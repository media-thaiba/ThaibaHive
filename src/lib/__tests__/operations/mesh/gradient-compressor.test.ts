import { GradientCompressor } from '@/lib/operations/mesh/gradient-compressor';
import { TopKSparsifier } from '@/lib/operations/mesh/topk-sparsifier';

describe('GradientCompressor & TopKSparsifier', () => {
  it('should sparsify gradient vector retaining top K percentage components', () => {
    const rawGradients = [0.01, 0.95, -0.85, 0.02, 0.05, -0.99];
    const sparsified = TopKSparsifier.sparsify(rawGradients, 0.5); // Keep top 50%

    expect(sparsified.sparseIndices.length).toBe(3);
    expect(sparsified.sparseValues.length).toBe(3);
    expect(sparsified.sparsityRatio).toBe(0.5);

    const reconstructed = TopKSparsifier.desparsify(sparsified);
    expect(reconstructed.length).toBe(6);
    expect(reconstructed[1]).toBe(0.95);
    expect(reconstructed[5]).toBe(-0.99);
    expect(reconstructed[0]).toBe(0);
  });

  it('should compress and decompress gradient vector with EF21 error feedback', () => {
    const compressor = new GradientCompressor();
    const gradient = [1.2, 0.05, -2.4, 0.1, 3.5];

    const compressed = compressor.compress('node_1', gradient, 0.6);
    expect(compressed.quantizedValues).toBeDefined();

    const decompressed = compressor.decompress(compressed);
    expect(decompressed.length).toBe(5);
  });
});
