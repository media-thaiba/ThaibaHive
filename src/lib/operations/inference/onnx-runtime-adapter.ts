import { EdgeModelConfig } from './inference-types';

/**
 * Lightweight ONNX / WebAssembly Runtime Adapter
 */
export class OnnxRuntimeAdapter {
  /**
   * Execute forward tensor multiplication and sigmoid/softmax activation
   */
  public static runForward(
    config: EdgeModelConfig,
    inputVector: number[]
  ): { probabilities: number[]; predictedClass: number; confidenceScore: number } {
    const { weights, biases, inputDim, outputDim, scaleFactor = 1.0, zeroPoint = 0 } = config;

    if (inputVector.length !== inputDim) {
      throw new Error(`Input vector dimension mismatch: expected ${inputDim}, got ${inputVector.length}`);
    }

    const rawOutputs = new Array(outputDim).fill(0);

    // Matrix multiplication: output = weights * input + bias
    for (let o = 0; o < outputDim; o++) {
      let sum = biases && biases[o] !== undefined ? biases[o] : 0;
      for (let i = 0; i < inputDim; i++) {
        const wIdx = o * inputDim + i;
        let w = weights[wIdx] || 0;
        if (config.quantizationFormat === 'INT8') {
          // Dequantize INT8 on the fly: w = (q - zeroPoint) * scale
          w = (w - zeroPoint) * scaleFactor;
        }
        sum += w * inputVector[i];
      }
      rawOutputs[o] = sum;
    }

    // Softmax normalization
    if (outputDim === 1) {
      // Single output sigmoid
      const z = rawOutputs[0];
      const p = 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, z))));
      const probs = [1 - p, p];
      const predictedClass = p >= 0.5 ? 1 : 0;
      const confidenceScore = Math.max(p, 1 - p);
      return { probabilities: probs, predictedClass, confidenceScore };
    }

    const maxLogit = Math.max(...rawOutputs);
    const exps = rawOutputs.map((z) => Math.exp(z - maxLogit));
    const sumExp = exps.reduce((s, e) => s + e, 0);
    const probs = exps.map((e) => e / Math.max(1e-12, sumExp));

    let maxProb = -1;
    let predictedClass = 0;
    for (let c = 0; c < probs.length; c++) {
      if (probs[c] > maxProb) {
        maxProb = probs[c];
        predictedClass = c;
      }
    }

    return {
      probabilities: probs.map((p) => Number(p.toFixed(4))),
      predictedClass,
      confidenceScore: Number(maxProb.toFixed(4)),
    };
  }
}
