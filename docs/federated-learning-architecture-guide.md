# Federated Learning Architecture & Orchestration Guide (A-FED / EdgeMesh)

## 1. Subsystem Architecture
The **A-FED** subsystem orchestrates decentralized machine learning across distributed multi-campus edge nodes without centralizing raw student or financial records.

```
[Campus Edge Nodes (A, B, C)] --> [Push-Sum Gossip Mesh] --> [SMPC Masking & zk-SNARK Verifier] --> [FedAvg/FedProx Aggregation Server]
```

## 2. Multi-Round Aggregation Mechanics
- **FedAvg**:
  $$w^{t+1} = \sum_{k=1}^K \frac{n_k}{N} w_k^{t+1}$$
- **FedProx**:
  $$w_k^{t+1} = \arg\min_w \left( F_k(w) + \frac{\mu}{2} \|w - w^t\|^2 \right)$$

## 3. Byzantine Defense Algorithms
- **Multi-Krum**: Filters out $f$ adversarial poisoning vectors by finding $n-f-2$ closest updates.
- **Coordinate-wise Median**: Computes the dimension-wise median across candidate weight vectors.
- **Trimmed Mean**: Discards top and bottom $\beta$ quantiles per dimension.
