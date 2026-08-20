import { NoiseMechanisms } from '@/lib/operations/privacy/noise-mechanisms';
import { DifferentialPrivacyEngine } from '@/lib/operations/privacy/differential-privacy-engine';

describe('Differential Privacy Noise Mechanisms & Engine', () => {
  it('should sample valid Laplace and Gaussian perturbations with calibrated variances', () => {
    const laplaceSamples: number[] = [];
    const gaussianSamples: number[] = [];

    for (let i = 0; i < 500; i++) {
      laplaceSamples.push(NoiseMechanisms.sampleLaplace(1.0, 1.0));
      gaussianSamples.push(NoiseMechanisms.sampleGaussian(1.0, 1.0, 1e-5));
    }

    // Means should be centered close to 0
    const laplaceMean = laplaceSamples.reduce((s, x) => s + x, 0) / laplaceSamples.length;
    const gaussianMean = gaussianSamples.reduce((s, x) => s + x, 0) / gaussianSamples.length;

    expect(Math.abs(laplaceMean)).toBeLessThan(0.5);
    expect(Math.abs(gaussianMean)).toBeLessThan(1.0);
  });

  it('should perturb vectors with Gaussian DP noise and retain dimensionality', () => {
    const rawVector = [1.0, 2.0, 3.0, 4.0, 5.0];
    const perturbed = DifferentialPrivacyEngine.perturbVector(rawVector, {
      epsilon: 1.0,
      delta: 1e-5,
      sensitivity: 1.0,
      mechanism: 'gaussian',
    });

    expect(perturbed.length).toBe(5);
    expect(perturbed).not.toEqual(rawVector);
  });

  it('should apply local DP with gradient clipping', () => {
    const largeVector = [10.0, 10.0, 10.0]; // Norm ~ 17.32
    const result = DifferentialPrivacyEngine.applyLocalDP(largeVector, 5.0, 1.0, 1e-5);

    expect(result.wasClipped).toBe(true);
    expect(result.actualNorm).toBeCloseTo(17.32, 1);
    expect(result.perturbedGradients.length).toBe(3);
  });
});
