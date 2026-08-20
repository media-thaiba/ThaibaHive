# Autonomous Fleet Logistics & Predictive Maintenance Guide

## 1. Capacitated Vehicle Routing with Time Windows (CVRPTW)

### Optimization Objective
$$\min \sum_{i,j} d_{ij} x_{ij} + \lambda \sum_i \max(0, a_i - l_i)$$

Subject to:
- Vehicle passenger capacity $\sum_{i} q_i \le Q_{\max}$
- Battery state of charge $SoC_t \ge 20\%$ reserve threshold
- Maximum continuous driver duty cycle $\le 4.0\text{ hours}$

## 2. Predictive Maintenance Degradation Analytics
Multi-subsystem health indices ($H \in [0, 100]$):
- **Powertrain Health**: Temperature limit $105^\circ\text{C}$, oil degradation factor
- **Braking System**: Pad wear index ($> 80\%$ triggers service alert)
- **Battery Health**: Cycle count and thermal impedance
- **Tire Pressure & Tread**: Dynamic PSI deviation alerts

## 3. Safety Guardrails & Weather Buffers
- **Campus Speed Limit**: Capped at $25\text{ km/h}$ in pedestrian-dense campus corridors.
- **Storm Protocol**: Heavy rain / storm weather automatically introduces a $+30\%$ transit time buffer and enables conservative braking profiles.
