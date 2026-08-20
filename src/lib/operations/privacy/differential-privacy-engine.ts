import { DPParameters } from './dp-types';
import { NoiseMechanisms } from './noise-mechanisms';

/**
 * Differential Privacy Perturbation Engine for Local & Central DP
 */
export class DifferentialPrivacyEngine {
  /**
   * Perturb vector with Differential Privacy noise
   */
  public static perturbVector(vector: number[], params: DPParameters): number[] {
    const { epsilon, delta = 1e-5, sensitivity = 1.0, mechanism = 'gaussian' } = params;
    const output = new Array(vector.length);

    for (let i = 0; i < vector.length; i++) {
      let noise = 0;
      if (mechanism === 'laplace') {
        noise = NoiseMechanisms.sampleLaplace(sensitivity, epsilon);
      } else {
        // Gaussian or Analytic Gaussian
        noise = NoiseMechanisms.sampleGaussian(sensitivity, epsilon, delta);
      }
      output[i] = vector[i] + noise;
    }

    return output;
  }

  /**
   * Calculate required noise standard deviation sigma given privacy parameters
   */
  public static getSigma(sensitivity: number, epsilon: number, delta: number = 1e-5): number {
    return NoiseMechanisms.computeGaussianSigma(sensitivity, epsilon, delta);
  }

  /**
   * Apply Local Differential Privacy (LDP) with bounded clipping on edge device
   */
  public static applyLocalDP(
    gradientVector: number[],
    clipThreshold: number,
    epsilon: number,
    delta: number = 1e-5
  ): { perturbedGradients: number[]; actualNorm: number; wasClipped: boolean } {
    // 1. Compute L2 norm
    let sumSq = 0;
    for (let i = 0; i < gradientVector.length; i++) {
      sumSq += gradientVector[i] * gradientVector[i];
    }
    const norm = Math.sqrt(sumSq);
    const wasClipped = norm > clipThreshold;

    // 2. Clip gradients
    const scale = wasClipped ? clipThreshold / norm : 1.0;
    const clipped = gradientVector.map((v) => v * scale);

    // 3. Add calibrated noise (sensitivity is clipThreshold)
    const perturbed = this.perturbVector(clipped, {
      epsilon,
      delta,
      sensitivity: clipThreshold,
      mechanism: 'gaussian',
    });

    return {
      perturbedGradients: perturbed,
      actualNorm: norm,
      wasClipped,
    };
  }
}
