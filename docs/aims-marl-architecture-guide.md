# AIMS Multi-Agent Reinforcement Learning (MARL) Architecture Guide

## 1. Overview & System Topology

The **Autonomous Intelligence & Multi-Agent Smart Campus System (AIMS / AutoOps)** coordinates physical, computational, and institutional operations across all ThaibaHive campuses.

```
+-----------------------------------------------------------------------------------+
|                        AIMS SMART CAMPUS RADAR DASHBOARD                          |
|             (HVAC Energy | Fleet Logistics | Edge Biometrics | Cloud ESG)          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                           MARL CENTRALIZED CRITIC                                 |
|                       Q(s, a_1, a_2, a_3, a_4) in [-1, +1]                        |
+-----------------------------------------------------------------------------------+
        |                       |                         |                      |
        v                       v                         v                      v
+---------------+       +---------------+       +---------------+      +---------------+
|  HVAC Agent   |       |  Fleet Agent  |       |Biometric Agent|      |  Cloud Agent  |
| ISO 7730 PMV  |       | CVRPTW Routing|       |  BN254 ZKP    |      |  GRI 305 ESG  |
+---------------+       +---------------+       +---------------+      +---------------+
        |                       |                         |                      |
        +-----------------------+-------------------------+----------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                     OPERATIONAL GUARDRAILS & KILL-SWITCH                          |
|         (Clamping: Temp [20-26°C], Driver <= 4h, Cloud Reserve >= 30%)             |
+-----------------------------------------------------------------------------------+
```

## 2. Actor-Critic Mathematical Foundations

### Decentralized Actor Policy
Each domain agent $i$ observes local state $o_i \in \mathcal{O}_i$ and executes decentralized continuous action vector $\mu_{\theta_i}(o_i)$:
$$a_i = \tanh(\mathbf{W}_i o_i + \mathbf{b}_i) \in [-1, +1]^{d_{a_i}}$$

### Centralized Critic Value Function
The centralized critic receives global state vector $\mathbf{s} \in \mathcal{S}$ and joint action $\mathbf{a} = (a_1, \dots, a_N)$, computing:
$$Q_\phi(\mathbf{s}, a_1, \dots, a_N) = \tanh\left(\sum_{k} w_k [\mathbf{s}, \mathbf{a}]_k + b\right)$$

### Temporal Difference (TD) Learning Update
$$\mathcal{L}(\phi) = \frac{1}{2} \left( r + \gamma Q_{\phi'}(\mathbf{s}', \mathbf{a}') - Q_\phi(\mathbf{s}, \mathbf{a}) \right)^2$$

## 3. Communication Mesh & Conflict Resolution
- **PubSub Channel**: Redis PubSub with SHA-256 message deduplication.
- **Arbitration Protocol**: Vickrey-Clarke-Groves (VCG) auction bids weighted with Nash bargaining priority for conflicting resource allocations.
- **Safety Envelope**: Deterministic safety checks clamp actions before deployment.
- **Circuit Breaker**: Sub-100ms instant cluster kill-switch (`POST /api/admin/operations/marl/override`).
