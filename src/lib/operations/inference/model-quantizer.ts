import { QuantizedModelPayload } from './inference-types';

/**
 * Post-Training Quantization Pipeline (INT8 / FP16)
 */
export class ModelQuantizer {
  /**
   * Quantize FP32 model weights to INT8 format: q = round(w / scale) + zeroPoint
   */
  public static quantizeToInt8(modelId: string, fp32Weights: number[]): QuantizedModelPayload {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const w of fp32Weights) {
      if (w < minVal) minVal = w;
      if (w > maxVal) maxVal = w;
    }

    // Symmetric / Asymmetric scale
    const range = Math.max(1e-7, maxVal - minVal);
    const scaleFactor = range / 255.0;
    const zeroPoint = Math.round(-minVal / scaleFactor);

    const quantized = fp32Weights.map((w) => {
      const q = Math.round(w / scaleFactor) + zeroPoint;
      return Math.max(0, Math.min(255, q));
    });

    const originalSizeKb = (fp32Weights.length * 4) / 1024;
    const quantizedSizeKb = (quantized.length * 1) / 1024;

    return {
      modelId,
      format: 'INT8',
      quantizedWeights: quantized,
      scaleFactor: Number(scaleFactor.toFixed(6)),
      zeroPoint,
      compressionRatio: Number((1.0 - quantizedSizeKb / Math.max(1e-3, originalSizeKb)).toFixed(2)),
      originalSizeKb: Number(originalSizeKb.toFixed(2)),
      quantizedSizeKb: Number(quantizedSizeKb.toFixed(2)),
    };
  }

  /**
   * Dequantize INT8 array back to FP32 for testing/comparison
   */
  public static dequantize(payload: QuantizedModelPayload): number[] {
    return payload.quantizedWeights.map((q) => (q - payload.zeroPoint) * payload.scaleFactor);
  }
}
