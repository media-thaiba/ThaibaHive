# Statistical Drift Detection & Autonomous Self-Healing Retraining Guide

## 1. Multi-Metric Drift Radar
- **Two-Sample Kolmogorov-Smirnov (KS) Test**:
  $$D = \sup_x |F_1(x) - F_2(x)|$$
- **Population Stability Index (PSI)**:
  $$\text{PSI} = \sum \left( (P_i - Q_i) \times \ln\left(\frac{P_i}{Q_i}\right) \right)$$
- **1D Wasserstein Distance (Earth Mover's Distance)**:
  $$W_1(u, v) = \int_{-\infty}^\infty |U(x) - V(x)| dx$$

## 2. Autonomous Retraining Decision Matrix
- $\text{PSI} < 0.1$: Distribution Stable (No action).
- $0.1 \le \text{PSI} < 0.25$: Moderate Shift (Warning logged to telemetry).
- $\text{PSI} \ge 0.25$ OR $\text{KS p-value} < 0.01$: Significant Shift $\rightarrow$ Autonomous Federated Retraining Triggered.
