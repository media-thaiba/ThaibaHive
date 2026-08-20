import * as crypto from 'crypto';

/**
 * Mathematical Differential Privacy Noise Mechanisms (Gaussian, Laplace, Analytic Gaussian)
 */
export class NoiseMechanisms {
  /**
   * Cryptographically secure standard uniform random sample in (0, 1)
   */
  public static sampleUniform(): number {
    const buf = crypto.randomBytes(4);
    const val = buf.readUInt32LE(0);
    return Math.max(1e-12, Math.min(1.0 - 1e-12, val / 0xffffffff));
  }

  /**
   * Box-Muller transform for standard Normal Gaussian sample N(0, 1)
   */
  public static sampleStandardGaussian(): number {
    const u1 = this.sampleUniform();
    const u2 = this.sampleUniform();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Laplace distribution sample with scale b = sensitivity / epsilon
   */
  public static sampleLaplace(sensitivity: number, epsilon: number): number {
    if (epsilon <= 0) throw new Error('Epsilon must be positive');
    const scale = sensitivity / epsilon;
    const u = this.sampleUniform() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Gaussian mechanism: sigma = (sensitivity * sqrt(2 * ln(1.25 / delta))) / epsilon
   */
  public static computeGaussianSigma(sensitivity: number, epsilon: number, delta: number): number {
    if (epsilon <= 0 || delta <= 0 || delta >= 1) {
      throw new Error('Epsilon and delta must satisfy epsilon > 0 and 0 < delta < 1');
    }
    return (sensitivity * Math.sqrt(2.0 * Math.log(1.25 / delta))) / epsilon;
  }

  /**
   * Gaussian sample with scale sigma
   */
  public static sampleGaussian(sensitivity: number, epsilon: number, delta: number): number {
    const sigma = this.computeGaussianSigma(sensitivity, epsilon, delta);
    return this.sampleStandardGaussian() * sigma;
  }
}
