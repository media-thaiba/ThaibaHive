import { MomentsAccountantState } from './dp-types';

/**
 * Moments Accountant using Rényi Differential Privacy (RDP) Composition
 */
export class MomentsAccountant {
  private state: MomentsAccountantState;

  // Standard Renyi alpha orders from 1.5 to 64
  private static readonly DEFAULT_ORDERS = [
    1.5, 1.75, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0, 20.0, 24.0, 28.0, 32.0,
    48.0, 64.0,
  ];

  constructor(targetDelta: number = 1e-5, orders: number[] = MomentsAccountant.DEFAULT_ORDERS) {
    this.state = {
      orders,
      rdpLoss: new Array(orders.length).fill(0),
      steps: 0,
      targetDelta,
    };
  }

  /**
   * Accumulate one Gaussian mechanism training step: RDP loss = alpha / (2 * sigma^2)
   */
  public stepGaussian(sigma: number, sampleRatio: number = 1.0): void {
    this.state.steps++;
    for (let i = 0; i < this.state.orders.length; i++) {
      const alpha = this.state.orders[i];
      // Subsampled Gaussian RDP bound approximation
      const rdpStep = (alpha * Math.pow(sampleRatio, 2)) / (2 * Math.pow(sigma, 2));
      this.state.rdpLoss[i] += rdpStep;
    }
  }

  /**
   * Convert cumulative RDP loss to (epsilon, delta)-DP bound:
   * epsilon(delta) = min_{alpha > 1} ( RDP(alpha) + ln(1 / delta) / (alpha - 1) )
   */
  public getEpsilon(customDelta?: number): number {
    const delta = customDelta ?? this.state.targetDelta;
    let minEpsilon = Infinity;

    for (let i = 0; i < this.state.orders.length; i++) {
      const alpha = this.state.orders[i];
      const rdp = this.state.rdpLoss[i];
      const eps = rdp + Math.log(1.0 / delta) / (alpha - 1.0);
      if (eps < minEpsilon) {
        minEpsilon = eps;
      }
    }

    return Number(minEpsilon.toFixed(4));
  }

  public getSteps(): number {
    return this.state.steps;
  }

  public static computeCumulativeEpsilon(steps: number, sigma: number = 1.0, targetDelta: number = 1e-5): number {
    const accountant = new MomentsAccountant(targetDelta);
    for (let s = 0; s < steps; s++) {
      accountant.stepGaussian(sigma);
    }
    return accountant.getEpsilon();
  }

  public reset(): void {
    this.state.rdpLoss.fill(0);
    this.state.steps = 0;
  }
}
