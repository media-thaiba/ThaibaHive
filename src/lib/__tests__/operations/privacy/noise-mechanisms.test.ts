import { NoiseMechanisms } from '@/lib/operations/privacy/noise-mechanisms';

describe('NoiseMechanisms Unit Tests', () => {
  it('should compute exact Gaussian standard deviation sigma', () => {
    const sigma = NoiseMechanisms.computeGaussianSigma(1.0, 1.0, 1e-5);
    // sigma = (1 * sqrt(2 * ln(1.25 / 1e-5))) / 1 = sqrt(2 * ln(125000)) = sqrt(2 * 11.736) ~ 4.84
    expect(sigma).toBeCloseTo(4.845, 1);
  });

  it('should throw error on invalid epsilon or delta inputs', () => {
    expect(() => NoiseMechanisms.computeGaussianSigma(1.0, -0.5, 1e-5)).toThrow();
    expect(() => NoiseMechanisms.computeGaussianSigma(1.0, 1.0, 1.5)).toThrow();
    expect(() => NoiseMechanisms.sampleLaplace(1.0, 0)).toThrow();
  });
});
