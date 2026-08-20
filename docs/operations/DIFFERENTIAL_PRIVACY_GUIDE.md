# Differential Privacy ($\epsilon, \delta$-DP) Engineering Guide

## Privacy Budget Tracking & Moments Accountant
A-FED employs Rényi Differential Privacy (RDP) composition to track cumulative privacy loss across multi-round federated training sessions.

### Key Equations
1. **Gaussian Mechanism RDP Step**:
   $$\text{RDP}(\alpha) = \frac{\alpha \cdot q^2}{2 \sigma^2}$$
2. **Conversion to $(\epsilon, \delta)$-DP**:
   $$\epsilon(\delta) = \min_{\alpha > 1} \left( \text{RDP}(\alpha) + \frac{\ln(1/\delta)}{\alpha - 1} \right)$$

### Adaptive Gradient Clipping
Gradients are strictly clipped to threshold $C$ before noise addition:
$$\bar{g} = g \cdot \min\left(1, \frac{C}{\|g\|_2}\right)$$
Quantile adjustments dynamically update $C$ to maintain signal-to-noise ratio.
