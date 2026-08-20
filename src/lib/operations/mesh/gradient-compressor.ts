import { CompressedGradientPayload } from './gossip-types';
import { TopKSparsifier } from './topk-sparsifier';

/**
 * Gradient Compressor with Error Feedback (EF21) & 8-Bit Quantization
 */
export class GradientCompressor {
  private errorFeedbackMemory: Map<string, number[]> = new Map(); // nodeId -> residual residuals

  /**
   * Compress gradient vector using Top-K and INT8 stochastic quantization with Error Feedback
   */
  public compress(
    nodeId: string,
    rawGradients: number[],
    topKRatio: number = 0.1
  ): CompressedGradientPayload {
    const dim = rawGradients.length;
    const memory = this.errorFeedbackMemory.get(nodeId) || new Array(dim).fill(0);

    // 1. Add previous error feedback residual: g_compensated = g + e_t
    const compensated = new Array(dim);
    for (let i = 0; i < dim; i++) {
      compensated[i] = rawGradients[i] + memory[i];
    }

    // 2. Sparsify via Top-K
    const sparse = TopKSparsifier.sparsify(compensated, topKRatio);

    // 3. INT8 Quantization: scale S = max(|v|) / 127
    const maxVal = Math.max(1e-7, ...sparse.sparseValues.map(Math.abs));
    const scaleFactor = maxVal / 127.0;
    const quantizedValues = sparse.sparseValues.map((v) => Math.round(v / scaleFactor));

    // 4. Compute and save new residual memory: e_{t+1} = compensated - dequantized
    const newMemory = new Array(dim).fill(0);
    const dequantizedValues = quantizedValues.map((q) => q * scaleFactor);

    // Set unsent indices to full compensated values
    const sentIndicesSet = new Set(sparse.sparseIndices);
    for (let i = 0; i < dim; i++) {
      if (!sentIndicesSet.has(i)) {
        newMemory[i] = compensated[i];
      }
    }

    // For sent indices, record quantization error
    for (let i = 0; i < sparse.sparseIndices.length; i++) {
      const idx = sparse.sparseIndices[i];
      newMemory[idx] = compensated[idx] - dequantizedValues[i];
    }
    this.errorFeedbackMemory.set(nodeId, newMemory);

    return {
      sparseIndices: sparse.sparseIndices,
      quantizedValues,
      scaleFactor,
      originalDimension: dim,
      compressionRatio: Number((1.0 - (sparse.sparseIndices.length * 2) / (dim * 4)).toFixed(3)),
    };
  }

  /**
   * Decompress INT8 quantized Top-K sparse payload into full dense gradient vector
   */
  public decompress(payload: CompressedGradientPayload): number[] {
    const dense = new Array(payload.originalDimension).fill(0);
    for (let i = 0; i < payload.sparseIndices.length; i++) {
      const idx = payload.sparseIndices[i];
      const val = payload.quantizedValues[i] * payload.scaleFactor;
      dense[idx] = val;
    }
    return dense;
  }

  public clearMemory(): void {
    this.errorFeedbackMemory.clear();
  }
}
