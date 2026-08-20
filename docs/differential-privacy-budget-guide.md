# Differential Privacy ($\epsilon, \delta$-DP) & Privacy Budget Management Guide

## 1. Mathematical Privacy Framework
Differential privacy guarantees that the inclusion or exclusion of any individual student record changes model output probabilities by at most $e^\epsilon$:
$$\Pr[\mathcal{M}(D) \in S] \le e^\epsilon \Pr[\mathcal{M}(D') \in S] + \delta$$

## 2. Moments Accountant & Rényi DP
- **Gaussian RDP Step**:
  $$\text{RDP}(\alpha) = \frac{\alpha \cdot q^2}{2 \sigma^2}$$
- **Composition across $T$ rounds**:
  $$\epsilon(\delta) = \min_{\alpha > 1} \left( T \cdot \text{RDP}(\alpha) + \frac{\ln(1/\delta)}{\alpha - 1} \right)$$

## 3. Dynamic Budget Allocation & Reset Policy
When remaining budget reaches $0$, all further model updates are frozen until authorization by the institutional Data Privacy Officer.
