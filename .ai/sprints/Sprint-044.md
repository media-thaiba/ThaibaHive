# Engineering Contract — Sprint-044

**Sprint ID:** SPRINT-044  
**Sprint Name:** Autonomous Federated Edge Learning & Decentralized Cross-Campus Institutional Analytics (A-FED / EdgeMesh)  
**Target Release Version:** v3.28.0  
**Contract Date:** 2026-08-20  
**Contract Status:** APPROVED (Reviewed by Claude Code, OpenCode & Architecture Team) — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-044-Recommendation.md`  
**Review Status:** ✅ Approved with commendations (Verified DAG dependencies, tenant isolation in schemas, DP privacy budget tracking, SMPC protocol integrity, and Merkle audit chain logging)  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, technical architecture, detailed task breakdown, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-044**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Building on the production-certified Autonomous Intelligence & Multi-Agent Smart Campus System (AIMS / AutoOps) delivered in Sprint-043 (v3.27.0), the Autonomous Resilience & Predictive Security Engine (ARES) delivered in Sprint-042 (v3.26.0), the Zero-Trust Autonomous Security Mesh (ZASM) delivered in Sprint-041 (v3.25.0), and the Autonomous Security Orchestration and Response (SOAR) engine delivered in Sprint-040 (v3.24.0), Sprint-044 advances ThaibaHive from **autonomous operations within single campus silos** to **privacy-preserving collaborative intelligence and decentralized cross-campus learning (A-FED / EdgeMesh)**.

Sprint-044 introduces **Autonomous Federated Edge Learning & Decentralized Cross-Campus Institutional Analytics (A-FED / EdgeMesh)**, transforming institutional analytics from centralized, privacy-risking data lakes into a decentralized, privacy-preserving collaborative model mesh where models learn collaboratively across campus boundaries without raw student or staff PII ever leaving institutional perimeters.

### Core Architectural Pillars for Sprint-044:

1. **Federated Learning Orchestration & Robust Aggregation:** Federated training coordination framework implementing FedAvg, FedProx, and Byzantine-resilient aggregation algorithms (Krum, Coordinate-wise Median, Trimmed Mean) to train generalized predictive models across heterogeneous campus datasets while resisting model poisoning attacks.
2. **Differential Privacy ($\epsilon, \delta$-DP) & Privacy Budget Accounting:** Mathematical privacy protection framework incorporating Gaussian and Laplace perturbation mechanisms, Rényi Differential Privacy (RDP), and Moments Accountant to guarantee strict mathematical privacy bounds with zero individual data reconstruction risk.
3. **Secure Multi-Party Computation (SMPC) & Cryptographic Masking:** Cryptographic protocols implementing Shamir secret sharing, additive vector masking, and zero-knowledge gradient integrity proofs (zk-SNARKs) allowing campus nodes to collaboratively aggregate model gradients without revealing intermediate local weights to coordinator servers.
4. **Decentralized Model Weight Synchronization Mesh:** Gossip protocol over WebSocket/gRPC mesh enabling peer-to-peer model weight convergence across multi-campus networks with network partition tolerance and bandwidth-efficient gradient compression (Top-K sparsification & 8-bit quantization).
5. **Automated Drift Detection & Self-Healing Retraining:** Continuous monitoring for covariate shift and concept drift using Kolmogorov-Smirnov tests, Population Stability Index (PSI), and Wasserstein distance metrics, triggering autonomous federated retraining pipelines when performance degrades.
6. **Edge-Native Inference Engine & Quantization Pipeline:** Sub-50ms on-device model evaluation using ONNX/WebAssembly runtimes, INT8/FP16 post-training quantization, and graceful cloud-fallback tiering.
7. **Privacy-Preserving Cross-Campus Benchmarking & Predictive Analytics:** Secure institutional benchmarking protocol aligning with IPEDS/HESA indicators, federated student retention prediction, and institutional financial forecasting.
8. **Dual-Store Persistence, Merkle Audit & OpenMetrics Telemetry:** Full Drizzle ORM dual-store persistence for SQLite and PostgreSQL across 9 new federated tables, SHA-256 Merkle chain audit logging for all model aggregations and privacy budget expenditures, and Prometheus OpenMetrics series exported at `/api/metrics`.
9. **Admin Collaborative Intelligence Radar UI & REST APIs:** Comprehensive 5-tab dashboard at `/admin/operations/federated-learning` featuring live Training Round Orchestrator, Differential Privacy Budget Radar, SMPC Mesh Topology, Model Drift & Retraining Monitor, and Cross-Campus Benchmarking Scorecard.
10. **End-to-End Simulation Test Harness & Operational Runbooks:** Automated simulation CLI (`scripts/operations/afed-simulation-runner.ts` / `pnpm afed:simulate`) and 5 comprehensive operational runbooks in `docs/`.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|---|---|
| 1 | **Federated Aggregation Server & Algorithms** | Multi-round federated training coordinator supporting FedAvg, FedProx (for non-IID data), and learning rate annealing. |
| 2 | **Federated Node Lifecycle & Client Orchestrator** | Worker registration, client selection sampling, heartbeat monitoring, and local training epoch dispatching across distributed campus nodes. |
| 3 | **Byzantine-Resilient Aggregation Defense** | Anomaly filtering algorithms (Krum, Multi-Krum, Coordinate-wise Median, Trimmed Mean) mitigating malicious or poisoned model updates. |
| 4 | **Differential Privacy ($\epsilon, \delta$-DP) Engine** | Local and central differential privacy noise injection (Gaussian, Laplace mechanisms) with calibrated sensitivity bounds. |
| 5 | **Moments Accountant & Privacy Budget Manager** | Strict $\epsilon$ budget tracking using Rényi Differential Privacy (RDP) composition theorems with automatic training cutoff upon budget depletion. |
| 6 | **Adaptive Gradient Clipping & Utility Optimizer** | Dynamic L2-norm gradient clipping balancing model convergence speed with differential privacy noise requirements. |
| 7 | **SMPC Secret Sharing & Additive Masking** | Shamir secret sharing and pairwise additive masking enabling secure vector aggregation without coordinator visibility into raw client updates. |
| 8 | **Zero-Knowledge Gradient Proof Verification** | zk-SNARK proof verification validating that client gradients respect clipping bounds and are computed from authorized enrollment data without revealing weights. |
| 9 | **Decentralized Weight Sync Mesh (Gossip Protocol)** | Peer-to-peer WebSocket/gRPC mesh for model weight dissemination across distributed campus sites without single point of failure. |
| 10 | **Partition-Tolerant CRDT Weight Buffer** | Conflict-Free Replicated Data Types reconciling concurrent asynchronous model updates following network partitions. |
| 11 | **Gradient Compression & Top-K Sparsification** | Bandwidth optimization reducing model gradient payload size by 80–90% via Top-K sparsification and INT8 quantization. |
| 12 | **Covariate Shift & Drift Detection Engine** | Statistical drift monitoring (Kolmogorov-Smirnov, Wasserstein distance, PSI) detecting dataset shifts across institutional demographics. |
| 13 | **Autonomous Self-Healing Retraining Pipeline** | Automated trigger pipeline initiating federated training rounds when model accuracy falls below configured SLA thresholds. |
| 14 | **Concept Drift Attribution & Feature Diagnostics** | Explainable drift analyzer identifying specific demographic or academic features driving model performance degradation. |
| 15 | **Edge-Native ONNX / WebAssembly Inference Engine** | Low-latency local model evaluation engine executing predictions on mobile and campus kiosk hardware in $< 50$ms. |
| 16 | **Post-Training Quantization & Pruning Pipeline** | Automated model optimization pipeline converting FP32 models to INT8/FP16 and pruning redundant neural connections. |
| 17 | **Edge Inference Cache & Fallback Tiering** | Tiered prediction engine with local cache and automatic fallback to cloud inference for complex, high-uncertainty samples. |
| 18 | **Cross-Campus Benchmarking Protocol (IPEDS/HESA)** | Privacy-preserving multi-campus performance comparison engine aggregating normalized academic and operational KPIs without raw data sharing. |
| 19 | **Federated Student Retention & Risk Predictor** | Collaborative predictive model identifying at-risk students 60–90 days prior to term completion without cross-campus PII aggregation. |
| 20 | **Federated Financial & Resource Demand Forecaster** | Multi-institutional budget and facility demand forecasting model trained collaboratively across campus entities. |
| 21 | **Dual-Store Persistence (SQLite & PostgreSQL)** | Drizzle ORM schemas and type-safe stores for 9 federated entities with 100% schema parity across SQLite (dev) and PostgreSQL (prod). |
| 22 | **Cryptographic Merkle Audit Trail** | Deterministic logging of all federated aggregation rounds, privacy budget expenditures, and model promotions into the SHA-256 Merkle audit chain. |
| 23 | **Prometheus OpenMetrics Telemetry** | 8 new OpenMetrics series tracking training round duration, convergence loss, epsilon budget consumed, drift score, and edge inference latency. |
| 24 | **Admin Collaborative Intelligence REST APIs** | RBAC-protected REST endpoints (`requireAuth`) for all federated training, privacy management, model deployment, and benchmarking operations. |
| 25 | **Admin Collaborative Intelligence Radar UI** | Comprehensive 5-tab dashboard at `/admin/operations/federated-learning` featuring live Training Radar, Privacy Budget Visualizer, Drift Radar, and Benchmarking Analytics. |
| 26 | **End-to-End Simulation Test Harness & Runbooks** | Automated simulation CLI (`scripts/operations/afed-simulation-runner.ts` / `pnpm afed:simulate`) and 5 engineering runbooks in `docs/`. |

---

### Out of Scope

| Area | Justification |
|---|---|
| Raw Student/Staff PII Aggregation or Centralized Data Lake Export | Federated learning explicitly operates on local model parameters and noise-perturbed gradients; centralized aggregation of raw student records or PII is strictly out of scope. |
| Custom Neural Network ASIC / GPU Hardware Acceleration Fabrication | The engine targets standard CPU, mobile edge WebAssembly, and existing CUDA/MPS GPUs using ONNX runtime; custom silicon development is out of scope. |
| Real-Time Cross-Institutional Financial Wire Transfers | Institutional financial forecasting generates predictive budget insights; executing live inter-bank monetary transactions is out of scope. |
| Manual Data Science Model Code Deployment Without Automated Verification | All model promotions must pass automated drift, convergence, and privacy verification tests before production deployment; unverified manual weight uploads are prohibited. |
| Unbounded Differential Privacy Budget Depletion | Models reaching configured $\epsilon$ privacy budget limits are halted from further training until reset by an authorized Privacy Officer; automatic unbounded budget consumption is prohibited. |

---

## 3. Technical Architecture & Component Interactions

```mermaid
flowchart TD
    subgraph Campus Edge Nodes (Distributed Campuses A, B, C)
        DATA_A[Local Campus Data\nAcademic, Financial, BMS] --> LOCAL_TRAIN_A[Local Model Training Engine\nPyTorch/ONNX Worker]
        LOCAL_TRAIN_A --> DP_NOISE_A[Differential Privacy Engine\nGaussian / Laplace Noise ($\epsilon, \delta$)]
        DP_NOISE_A --> SMPC_MASK_A[SMPC Secret Sharing\nAdditive Vector Masking]
        SMPC_MASK_A --> ZK_PROVER_A[zk-SNARK Gradient Prover\nBound & Integrity Proof $\pi$]
    end

    subgraph Decentralized Model Mesh & Gossip Layer
        ZK_PROVER_A --> GOSSIP_MESH[Decentralized Gossip Mesh\nWebSocket / gRPC PubSub]
        GOSSIP_MESH --> CRDT_WEIGHTS[Partition-Tolerant CRDT\nModel Weight Buffer]
    end

    subgraph Federated Aggregation & Robust Defense Server
        CRDT_WEIGHTS --> ZK_VERIFY[zk-SNARK Gradient Verifier]
        ZK_VERIFY --> BYZANTINE_FILTER[Byzantine-Resilient Filter\nKrum / Coordinate Median / Trimmed Mean]
        BYZANTINE_FILTER --> AGG_ENGINE[Federated Aggregator\nFedAvg / FedProx ($\mu$)]
        AGG_ENGINE --> MOMENTS_ACC[Moments Accountant\nPrivacy Budget $\epsilon, \delta$ Tracker]
    end

    subgraph Autonomous Drift & Retraining Pipeline
        AGG_ENGINE --> MODEL_REGISTRY[Global Model Registry]
        MODEL_REGISTRY --> DRIFT_MONITOR[Covariate Shift & Drift Monitor\nKS-Test / PSI / Wasserstein]
        DRIFT_MONITOR -->|Drift > Threshold| RETRAIN_TRIGGER[Autonomous Retraining Pipeline]
        RETRAIN_TRIGGER -->|Trigger Round| AGG_ENGINE
    end

    subgraph Edge-Native Model Inference
        MODEL_REGISTRY --> QUANT_PIPELINE[INT8/FP16 Quantization & Pruning]
        QUANT_PIPELINE --> EDGE_RUNTIME[Edge ONNX / WASM Inference Engine]
        EDGE_RUNTIME --> PREDICTIONS[Sub-50ms Local Student Risk & Energy Predictions]
    end

    subgraph Cross-Campus Benchmarking
        AGG_ENGINE --> BENCHMARK_ENGINE[Privacy-Preserving Benchmarking\nIPEDS / HESA Metrics]
    end

    subgraph Persistence, Merkle Audit & OpenMetrics
        AGG_ENGINE & MOMENTS_ACC & DRIFT_MONITOR & BENCHMARK_ENGINE --> DB[(Dual-Store Persistence\nSQLite & PostgreSQL)]
        AGG_ENGINE & MOMENTS_ACC & DRIFT_MONITOR & BENCHMARK_ENGINE --> MERKLE[SHA-256 Merkle Audit Chain]
        AGG_ENGINE & MOMENTS_ACC & DRIFT_MONITOR & BENCHMARK_ENGINE --> METRICS[Prometheus OpenMetrics Telemetry]
        
        DB & MERKLE & METRICS --> RADAR_UI[Admin Collaborative Intelligence Radar\n/admin/operations/federated-learning]
    end
```

---

## 4. Implementation Task Breakdown

> Tasks are organized across 9 logical implementation phases in strict dependency order. Core mathematical aggregators, privacy engines, and cryptographic provers MUST be constructed and unit-tested before downstream synchronizers, UI panels, simulation harnesses, and operational runbooks are built.

---

### Phase 1 — Federated Learning Core & Aggregation Server

#### AFED-001 — Federated Aggregation Server & FedAvg / FedProx Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-001 |
| **Phase** | Phase 1 — Federated Learning Core & Aggregation Server |
| **Description** | Implement the core Federated Learning Aggregation Server in `src/lib/operations/federated/fed-aggregation-server.ts`, `federated-types.ts`, and `fed-algorithms.ts`. Support Federated Averaging (FedAvg) and Federated Proximal (FedProx with proximal term $\frac{\mu}{2} \|w - w^t\|^2$) for non-IID heterogeneous institutional datasets. Manage training rounds, weight tensors, participant weighting based on sample volume $n_k / N$, learning rate schedules, and convergence criteria. |
| **Files** | `src/lib/operations/federated/federated-types.ts` [NEW] · `src/lib/operations/federated/fed-algorithms.ts` [NEW] · `src/lib/operations/federated/fed-aggregation-server.ts` [NEW] · `src/lib/__tests__/operations/federated/fed-algorithms.test.ts` [NEW] · `src/lib/__tests__/operations/federated/fed-aggregation-server.test.ts` [NEW] |
| **Dependencies** | None (Foundational Core Primitive) |
| **Acceptance Criteria** | 1. `FedAggregationServer` orchestrates multi-round training sessions across distributed nodes with configurable client participation ratios.<br>2. Implements FedAvg with exact weighted tensor aggregation: $w^{t+1} = \sum_{k=1}^K \frac{n_k}{N} w_k^{t+1}$.<br>3. Implements FedProx with configurable proximal parameter $\mu \in [0.001, 1.0]$ preventing client drift on heterogeneous data.<br>4. Computes aggregated model weights in $< 100$ms for models with 100,000+ parameters.<br>5. 100% unit test coverage validating mathematical tensor updates, convergence rates, and non-IID weight balancing across 25+ test scenarios. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/federated/fed-algorithms` and `fed-aggregation-server`. Assert mathematical soundness of FedAvg and FedProx convergence. |
| **Estimated Complexity** | High |

---

#### AFED-002 — Federated Node Orchestrator & Client Worker Lifecycle Manager

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-002 |
| **Phase** | Phase 1 — Federated Learning Core & Aggregation Server |
| **Description** | Implement the federated edge node orchestrator (`src/lib/operations/federated/fed-node-orchestrator.ts`) and client worker lifecycle manager (`src/lib/operations/federated/fed-client-worker.ts`). Manage edge node registration, capability negotiation (compute capacity, network bandwidth, available datasets), heartbeat monitoring, client selection sampling (uniform, importance-weighted, tier-based), and local epoch dispatching. |
| **Files** | `src/lib/operations/federated/fed-node-orchestrator.ts` [NEW] · `src/lib/operations/federated/fed-client-worker.ts` [NEW] · `src/lib/__tests__/operations/federated/fed-node-orchestrator.test.ts` [NEW] · `src/lib/__tests__/operations/federated/fed-client-worker.test.ts` [NEW] |
| **Dependencies** | AFED-001 |
| **Acceptance Criteria** | 1. `FedNodeOrchestrator` manages 50+ concurrent campus edge nodes with dynamic status tracking (`idle`, `training`, `reporting`, `offline`).<br>2. Client selection algorithm selects representative node cohorts per round meeting minimum participant thresholds.<br>3. `FedClientWorker` simulates or dispatches local training epochs, computes local gradient updates, and serializes delta weights.<br>4. Detects unresponsive or straggler nodes with configurable timeout (e.g. 30s) and proceeds with available updates.<br>5. Unit tests assert node registration, cohort selection sampling, heartbeat timeouts, and local worker lifecycle transitions. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/federated/fed-node-orchestrator` and `fed-client-worker`. |
| **Estimated Complexity** | Medium-High |

---

#### AFED-003 — Byzantine-Resilient Aggregation & Model Poisoning Defense

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-003 |
| **Phase** | Phase 1 — Federated Learning Core & Aggregation Server |
| **Description** | Implement Byzantine-resilient aggregation algorithms and model poisoning defense in `src/lib/operations/federated/byzantine-defense.ts` and `poisoning-detector.ts`. Mitigate label flipping, gradient inversion, and backdoor poisoning attacks from compromised or faulty campus nodes. Implement Multi-Krum ($m$-Krum), Coordinate-wise Median, Trimmed Mean ($\beta$-trimmed mean), and Bulyan aggregation algorithms to filter out anomalous gradient vectors before model update commitment. |
| **Files** | `src/lib/operations/federated/byzantine-defense.ts` [NEW] · `src/lib/operations/federated/poisoning-detector.ts` [NEW] · `src/lib/__tests__/operations/federated/byzantine-defense.test.ts` [NEW] · `src/lib/__tests__/operations/federated/poisoning-detector.test.ts` [NEW] |
| **Dependencies** | AFED-001, AFED-002 |
| **Acceptance Criteria** | 1. Implements Krum and Multi-Krum selecting gradient vectors minimizing sum of Euclidean distances to closest $n - f - 2$ neighbors.<br>2. Implements Coordinate-wise Median and Trimmed Mean with configurable trim percentage $\beta \in [0.05, 0.40]$.<br>3. Successfully neutralizes up to $33\%$ Byzantine malicious nodes attempting model poisoning without degrading global convergence accuracy.<br>4. Computes defense filtering in $< 50$ms for cohorts of 30 nodes.<br>5. Unit tests assert rejection of poison vectors, outlier detection precision, and robust model convergence under adversarial attacks. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/federated/byzantine-defense` and `poisoning-detector`. |
| **Estimated Complexity** | High |

---

### Phase 2 — Differential Privacy & Privacy Budget Engine

#### AFED-004 — Differential Privacy ($\epsilon, \delta$-DP) Noise Engine & Perturbation Mechanisms

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-004 |
| **Phase** | Phase 2 — Differential Privacy & Privacy Budget Engine |
| **Description** | Implement the Differential Privacy ($\epsilon, \delta$-DP) perturbation engine in `src/lib/operations/privacy/differential-privacy-engine.ts`, `dp-types.ts`, and `noise-mechanisms.ts`. Implement calibrated Gaussian mechanism ($\sigma = \frac{\Delta_2 f \sqrt{2\ln(1.25/\delta)}}{\epsilon}$), Laplace mechanism ($\lambda = \frac{\Delta_1 f}{\epsilon}$), and Analytic Gaussian mechanism for tight privacy guarantees. Provide both Local Differential Privacy (LDP) applied at client edge nodes and Central Differential Privacy (CDP) applied during server aggregation. |
| **Files** | `src/lib/operations/privacy/dp-types.ts` [NEW] · `src/lib/operations/privacy/noise-mechanisms.ts` [NEW] · `src/lib/operations/privacy/differential-privacy-engine.ts` [NEW] · `src/lib/__tests__/operations/privacy/noise-mechanisms.test.ts` [NEW] · `src/lib/__tests__/operations/privacy/differential-privacy-engine.test.ts` [NEW] |
| **Dependencies** | None (Core Privacy Primitive) |
| **Acceptance Criteria** | 1. `DifferentialPrivacyEngine` injects mathematically certified noise matching exact $(\epsilon, \delta)$ specifications.<br>2. Supports Gaussian, Laplace, and Analytic Gaussian mechanisms with configurable sensitivity $\Delta f$.<br>3. Guarantees zero individual data reconstruction while maintaining $\ge 92\%$ aggregate model utility.<br>4. Injects noise into 100,000+ vector elements in $< 20$ms.<br>5. Unit tests verify noise distribution parameters, variance scaling, $(\epsilon, \delta)$ mathematical correctness, and reproducibility with cryptographic PRNG seeds. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/privacy/noise-mechanisms` and `differential-privacy-engine`. |
| **Estimated Complexity** | High |

---

#### AFED-005 — Moments Accountant & Privacy Budget Management Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-005 |
| **Phase** | Phase 2 — Differential Privacy & Privacy Budget Engine |
| **Description** | Implement the Moments Accountant and Privacy Budget Management engine in `src/lib/operations/privacy/moments-accountant.ts` and `privacy-budget-manager.ts`. Implement Rényi Differential Privacy (RDP) composition theorems and privacy loss distribution (PLD) accountants to tightly bound accumulated $(\epsilon, \delta)$ privacy loss across successive federated training rounds. Track per-institution, per-model, and per-attribute lifetime privacy budgets, triggering automated training cessation upon budget depletion. |
| **Files** | `src/lib/operations/privacy/moments-accountant.ts` [NEW] · `src/lib/operations/privacy/privacy-budget-manager.ts` [NEW] · `src/lib/__tests__/operations/privacy/moments-accountant.test.ts` [NEW] · `src/lib/__tests__/operations/privacy/privacy-budget-manager.test.ts` [NEW] |
| **Dependencies** | AFED-004 |
| **Acceptance Criteria** | 1. `MomentsAccountant` tracks cumulative privacy loss $\alpha_M(\lambda)$ over $T$ composition steps using RDP order $\lambda \in [1.5, 64]$.<br>2. Converts RDP to standard $(\epsilon, \delta)$-DP yielding significantly tighter bounds than standard Advanced Composition Theorems.<br>3. `PrivacyBudgetManager` enforces hard maximum $\epsilon_{\text{total}}$ limits per institutional tenant.<br>4. Rejects any training round or query exceeding remaining privacy budget with HTTP 429 / PrivacyBudgetExhausted error.<br>5. Unit tests assert composition calculations, conversion bounds, multi-round budget depletion, and rejection triggers. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/privacy/moments-accountant` and `privacy-budget-manager`. |
| **Estimated Complexity** | High |

---

#### AFED-006 — Adaptive Gradient Clipping & Utility-Privacy Optimizer

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-006 |
| **Phase** | Phase 2 — Differential Privacy & Privacy Budget Engine |
| **Description** | Implement adaptive gradient clipping and the utility-privacy optimization engine in `src/lib/operations/privacy/adaptive-gradient-clipper.ts` and `utility-privacy-optimizer.ts`. Automatically determine optimal L2-norm clipping threshold $C$ per training round using empirical quantile estimation (e.g. median gradient norm) with DP-preserving quantile queries. Balance noise scale with gradient scale to maximize model convergence speed while strictly preserving DP bounds. |
| **Files** | `src/lib/operations/privacy/adaptive-gradient-clipper.ts` [NEW] · `src/lib/operations/privacy/utility-privacy-optimizer.ts` [NEW] · `src/lib/__tests__/operations/privacy/adaptive-gradient-clipper.test.ts` [NEW] · `src/lib/__tests__/operations/privacy/utility-privacy-optimizer.test.ts` [NEW] |
| **Dependencies** | AFED-004, AFED-005 |
| **Acceptance Criteria** | 1. `AdaptiveGradientClipper` scales gradient vectors $\bar{g} = g / \max(1, \|g\|_2 / C)$ preventing gradient explosion.<br>2. Dynamically adjusts threshold $C_t$ across rounds without leaking private distribution data.<br>3. `UtilityPrivacyOptimizer` recommends optimal $(\epsilon, \text{batch\_size}, \text{rounds})$ hyperparameters given target accuracy goals.<br>4. Processes gradient clipping across 100,000 parameters in $< 15$ms.<br>5. Unit tests assert clipping threshold compliance, quantile estimation accuracy, and utility preservation under varying noise scales. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/privacy/adaptive-gradient-clipper` and `utility-privacy-optimizer`. |
| **Estimated Complexity** | Medium-High |

---

### Phase 3 — Secure Multi-Party Computation (SMPC) & Cryptographic Protocols

#### AFED-007 — Cryptographic Secret Sharing & Additive Homomorphic Primitives

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-007 |
| **Phase** | Phase 3 — Secure Multi-Party Computation (SMPC) & Cryptographic Protocols |
| **Description** | Implement cryptographic secret sharing and additive homomorphic primitives in `src/lib/operations/crypto/smpc-types.ts`, `secret-sharing.ts`, and `homomorphic-primitives.ts`. Implement $(t, n)$-threshold Shamir Secret Sharing over finite fields $\mathbb{F}_p$ and additive pairwise random masking (SecAgg primitive) for distributed weight aggregation. Provide modular arithmetic and polynomial interpolation routines with constant-time cryptographic primitives. |
| **Files** | `src/lib/operations/crypto/smpc-types.ts` [NEW] · `src/lib/operations/crypto/secret-sharing.ts` [NEW] · `src/lib/operations/crypto/homomorphic-primitives.ts` [NEW] · `src/lib/__tests__/operations/crypto/secret-sharing.test.ts` [NEW] · `src/lib/__tests__/operations/crypto/homomorphic-primitives.test.ts` [NEW] |
| **Dependencies** | None (Core Cryptographic Primitive) |
| **Acceptance Criteria** | 1. `SecretSharing` splits secrets into $n$ shares where any $t \le n$ shares reconstruct the exact secret and $\le t-1$ shares reveal zero information.<br>2. Implements polynomial evaluation and Lagrange interpolation over large prime Galois fields $\mathbb{F}_p$ ($p > 2^{128}$).<br>3. `HomomorphicPrimitives` supports additive operations on ciphertexts/masked shares: $D(E(a) + E(b)) = a + b$.<br>4. Reconstructs 1,000 shares in $< 25$ms with constant-time execution preventing timing side-channel leaks.<br>5. Unit tests assert threshold reconstruction soundness, information-theoretic security, field arithmetic precision, and edge cases. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/crypto/secret-sharing` and `homomorphic-primitives`. |
| **Estimated Complexity** | High |

---

#### AFED-008 — SMPC Secure Aggregation Protocol & Masking Vector Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-008 |
| **Phase** | Phase 3 — Secure Multi-Party Computation (SMPC) & Cryptographic Protocols |
| **Description** | Implement the full Secure Aggregation (SecAgg) protocol in `src/lib/operations/crypto/secure-aggregation.ts` and `masking-vector-engine.ts`. Follow the Google SecAgg / Bonawitz et al. 4-phase protocol: (1) Key Exchange with Diffie-Hellman / X25519 pairs, (2) Masked Input Collection with pairwise random seed masks $s_{u,v}$ and private self-masks $b_u$, (3) Consistency Check / Unmasking of dropped nodes via threshold secret sharing, and (4) Output Aggregation where pairwise masks cancel out ($\sum_{u} y_u = \sum_{u} x_u$). |
| **Files** | `src/lib/operations/crypto/secure-aggregation.ts` [NEW] · `src/lib/operations/crypto/masking-vector-engine.ts` [NEW] · `src/lib/__tests__/operations/crypto/secure-aggregation.test.ts` [NEW] · `src/lib/__tests__/operations/crypto/masking-vector-engine.test.ts` [NEW] |
| **Dependencies** | AFED-007 |
| **Acceptance Criteria** | 1. `SecureAggregationProtocol` executes complete 4-round cryptographic aggregation across 20+ participating nodes.<br>2. Coordinator server learns ONLY the sum of client vectors $\sum x_k$ and gains 0 information about individual client models $x_k$.<br>3. Gracefully handles up to $30\%$ node dropouts during collection phase by reconstructing only dropout masks via threshold shares.<br>4. Aggregation of 100,000-dimensional masked vectors completes in $< 200$ms.<br>5. Unit tests verify mask cancellation algebra, dropout recovery, key exchange validation, and collusion resistance. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/crypto/secure-aggregation` and `masking-vector-engine`. |
| **Estimated Complexity** | High |

---

#### AFED-009 — Zero-Knowledge Gradient Integrity Proof Verifier (zk-SNARK)

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-009 |
| **Phase** | Phase 3 — Secure Multi-Party Computation (SMPC) & Cryptographic Protocols |
| **Description** | Implement the zero-knowledge gradient integrity circuit and verifier in `src/lib/operations/crypto/zk-gradient-verifier.ts` and `zk-gradient-circuits.ts` using Groth16 / BN254 SNARKs (extending Sprint-042/043 ZKP infrastructure). Clients generate a succinct proof $\pi$ proving that: (1) Gradient vector $\vec{g}$ satisfies L2-norm clipping bound $\|\vec{g}\|_2 \le C$, (2) Gradient was computed over valid local dataset committed via Merkle root, and (3) Client possesses valid authorized federated participant token — without revealing the gradient values. |
| **Files** | `src/lib/operations/crypto/zk-gradient-circuits.ts` [NEW] · `src/lib/operations/crypto/zk-gradient-verifier.ts` [NEW] · `src/lib/__tests__/operations/crypto/zk-gradient-verifier.test.ts` [NEW] |
| **Dependencies** | AFED-006, AFED-007, AFED-008 |
| **Acceptance Criteria** | 1. Generates and verifies zk-SNARK gradient integrity proofs on BN254 curves in $< 30$ms on server verifier.<br>2. Verifier rejects any gradient proof violating L2-norm clipping limits or generated by unauthorized nodes.<br>3. Zero gradient values or weight parameters leaked in public proof inputs.<br>4. Protects against proof replay using round-specific epoch challenges.<br>5. Unit tests assert proof generation soundness, verification speed, invalid proof rejection, and zero-knowledge privacy properties. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/crypto/zk-gradient-verifier`. |
| **Estimated Complexity** | High |

---

### Phase 4 — Decentralized Model Synchronization Mesh & Gossip Protocol

#### AFED-010 — Decentralized Model Weight Sync Mesh & Gossip Protocol

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-010 |
| **Phase** | Phase 4 — Decentralized Model Synchronization Mesh & Gossip Protocol |
| **Description** | Implement the decentralized peer-to-peer model weight synchronization mesh and gossip protocol in `src/lib/operations/mesh/model-gossip-mesh.ts`, `gossip-types.ts`, and `peer-connection-manager.ts`. Enable model weight dissemination and decentralized averaging across distributed multi-campus nodes over WebSocket/gRPC channels without relying on a single central server. Support push-sum gossip averaging, peer discovery, and adaptive fanout $(k = 3)$. |
| **Files** | `src/lib/operations/mesh/gossip-types.ts` [NEW] · `src/lib/operations/mesh/peer-connection-manager.ts` [NEW] · `src/lib/operations/mesh/model-gossip-mesh.ts` [NEW] · `src/lib/__tests__/operations/mesh/model-gossip-mesh.test.ts` [NEW] · `src/lib/__tests__/operations/mesh/peer-connection-manager.test.ts` [NEW] |
| **Dependencies** | AFED-001 |
| **Acceptance Criteria** | 1. `ModelGossipMesh` disseminates model weight updates to $N$ nodes in $O(\log N)$ gossip communication rounds.<br>2. Implements Push-Sum distributed averaging algorithm converging to exact network average weights.<br>3. `PeerConnectionManager` handles dynamic connection pooling, heartbeats, and automatic reconnection over WebSocket/gRPC.<br>4. Supports message deduplication using cryptographic content hashing (SHA-256).<br>5. Unit tests assert gossip message propagation, push-sum weight convergence, peer failover, and message deduplication. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/mesh/model-gossip-mesh` and `peer-connection-manager`. |
| **Estimated Complexity** | High |

---

#### AFED-011 — Partition-Tolerant CRDT Model Weight Buffer & Conflict Reconciliation

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-011 |
| **Phase** | Phase 4 — Decentralized Model Synchronization Mesh & Gossip Protocol |
| **Description** | Implement the partition-tolerant Conflict-Free Replicated Data Type (CRDT) model weight buffer and reconciliation engine in `src/lib/operations/mesh/crdt-weight-buffer.ts` and `weight-reconciliation.ts`. Maintain vector clocks, causal trees, and convergent PN-Counter / LWW-Register state representations for asynchronous model updates. When network partitions heal, automatically merge branched model weights using federated proximal reconciliations without loss of training progress. |
| **Files** | `src/lib/operations/mesh/crdt-weight-buffer.ts` [NEW] · `src/lib/operations/mesh/weight-reconciliation.ts` [NEW] · `src/lib/__tests__/operations/mesh/crdt-weight-buffer.test.ts` [NEW] · `src/lib/__tests__/operations/mesh/weight-reconciliation.test.ts` [NEW] |
| **Dependencies** | AFED-010 |
| **Acceptance Criteria** | 1. `CrdtWeightBuffer` records concurrent asynchronous model updates using monotonic vector clocks.<br>2. Resolves multi-campus network splits and split-brain scenarios deterministically upon partition recovery.<br>3. `WeightReconciliation` computes weighted average merge between branched campus model states.<br>4. Reconciles divergent weights in $< 50$ms with 0 state loss.<br>5. Unit tests assert partition simulation, causal order preservation, concurrent update merging, and mathematical idempotence. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/mesh/crdt-weight-buffer` and `weight-reconciliation`. |
| **Estimated Complexity** | Medium-High |

---

#### AFED-012 — Gradient Compression & Top-K Sparsification Pipeline

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-012 |
| **Phase** | Phase 4 — Decentralized Model Synchronization Mesh & Gossip Protocol |
| **Description** | Implement the gradient compression and sparsification pipeline in `src/lib/operations/mesh/gradient-compressor.ts` and `topk-sparsifier.ts`. Mitigate WAN bandwidth bottlenecks during cross-campus weight synchronization. Implement Top-K absolute gradient selection (transmitting top 1–10% largest magnitude values), Error Feedback (EF21 / memory compensation accumulating unsent gradients), and 8-bit / 4-bit stochastic quantization. |
| **Files** | `src/lib/operations/mesh/topk-sparsifier.ts` [NEW] · `src/lib/operations/mesh/gradient-compressor.ts` [NEW] · `src/lib/__tests__/operations/mesh/topk-sparsifier.test.ts` [NEW] · `src/lib/__tests__/operations/mesh/gradient-compressor.test.ts` [NEW] |
| **Dependencies** | AFED-010 |
| **Acceptance Criteria** | 1. Reduces transmitted gradient payload size by $\ge 85\%$ while maintaining $\ge 98\%$ convergence accuracy compared to uncompressed training.<br>2. `TopkSparsifier` extracts Top-K elements in $O(N)$ expected time using QuickSelect.<br>3. Error Feedback buffer stores residual residuals and adds them back into subsequent rounds.<br>4. Compresses 1,000,000 float32 weights in $< 30$ms.<br>5. Unit tests assert compression ratios, error feedback accumulation, quantization accuracy, and de-sparsification integrity. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/mesh/topk-sparsifier` and `gradient-compressor`. |
| **Estimated Complexity** | Medium |

---

### Phase 5 — Automated Drift Detection, Covariate Shift & Self-Healing Retraining

#### AFED-013 — Statistical Drift Detection & Population Covariate Shift Monitor

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-013 |
| **Phase** | Phase 5 — Automated Drift Detection, Covariate Shift & Self-Healing Retraining |
| **Description** | Implement the statistical drift detection and covariate shift monitor in `src/lib/operations/drift/drift-types.ts`, `statistical-drift-detector.ts`, and `covariate-shift-monitor.ts`. Ingest live production prediction inputs and target distributions. Compute two-sample Kolmogorov-Smirnov (KS) tests, Population Stability Index (PSI), Wasserstein Distance (Earth Mover's Distance), and Jensen-Shannon Divergence against baseline reference training distributions to detect distribution drift across campus demographics. |
| **Files** | `src/lib/operations/drift/drift-types.ts` [NEW] · `src/lib/operations/drift/statistical-drift-detector.ts` [NEW] · `src/lib/operations/drift/covariate-shift-monitor.ts` [NEW] · `src/lib/__tests__/operations/drift/statistical-drift-detector.test.ts` [NEW] · `src/lib/__tests__/operations/drift/covariate-shift-monitor.test.ts` [NEW] |
| **Dependencies** | None (Core Drift Primitive) |
| **Acceptance Criteria** | 1. Computes KS-test $p$-values and test statistic $D = \sup_x |F_1(x) - F_2(x)|$ in real time.<br>2. Calculates PSI with standardized severity bins ($\text{PSI} < 0.1$ Stable, $0.1 \le \text{PSI} \le 0.2$ Moderate Drift, $\text{PSI} > 0.2$ Significant Drift).<br>3. Evaluates 100,000 feature observations across 20 dimensions in $< 25$ms.<br>4. Emits structured drift alerts with feature-level severity rankings.<br>5. Unit tests assert statistical precision against known synthetic drift distributions, false-alarm rates ($< 5\%$), and alert thresholds. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/drift/statistical-drift-detector` and `covariate-shift-monitor`. |
| **Estimated Complexity** | High |

---

#### AFED-014 — Autonomous Retraining Trigger Pipeline & Model Promotion Validation

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-014 |
| **Phase** | Phase 5 — Automated Drift Detection, Covariate Shift & Self-Healing Retraining |
| **Description** | Implement the self-healing retraining pipeline and model promotion validator in `src/lib/operations/drift/retraining-pipeline.ts` and `model-promotion-validator.ts`. When significant drift ($\text{PSI} > 0.2$ or accuracy drop $> 5\%$) is detected, automatically initiate a federated retraining round across campus edge nodes. Evaluate candidate models against shadow validation sets, test for regressions, and promote validated models to production registry with zero-downtime hot swapping. |
| **Files** | `src/lib/operations/drift/retraining-pipeline.ts` [NEW] · `src/lib/operations/drift/model-promotion-validator.ts` [NEW] · `src/lib/__tests__/operations/drift/retraining-pipeline.test.ts` [NEW] · `src/lib/__tests__/operations/drift/model-promotion-validator.test.ts` [NEW] |
| **Dependencies** | AFED-001, AFED-005, AFED-013 |
| **Acceptance Criteria** | 1. `RetrainingPipeline` triggers automated federated training rounds upon drift threshold breach while checking privacy budget availability.<br>2. `ModelPromotionValidator` benchmarks candidate model vs. active production model on accuracy, F1-score, and latency.<br>3. Blocks promotion if candidate model exhibits performance regressions or unfair bias across demographic subgroups.<br>4. Supports blue/green canary model deployment with instant rollback.<br>5. Unit tests assert trigger conditions, privacy checks, promotion gating, canary routing, and rollback execution. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/drift/retraining-pipeline` and `model-promotion-validator`. |
| **Estimated Complexity** | Medium-High |

---

#### AFED-015 — Concept Drift Attribution & Feature Contribution Analyzer

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-015 |
| **Phase** | Phase 5 — Automated Drift Detection, Covariate Shift & Self-Healing Retraining |
| **Description** | Implement the concept drift attribution and feature contribution analyzer in `src/lib/operations/drift/drift-attribution.ts` and `feature-contribution-analyzer.ts`. Compute SHAP-inspired feature importance shifts and Kullback-Leibler (KL) divergence decompositions per input attribute. Identify whether accuracy drop is caused by demographic shifts, curriculum changes, or seasonal factors, and generate human-readable diagnostic summaries for academic leadership. |
| **Files** | `src/lib/operations/drift/drift-attribution.ts` [NEW] · `src/lib/operations/drift/feature-contribution-analyzer.ts` [NEW] · `src/lib/__tests__/operations/drift/drift-attribution.test.ts` [NEW] · `src/lib/__tests__/operations/drift/feature-contribution-analyzer.test.ts` [NEW] |
| **Dependencies** | AFED-013 |
| **Acceptance Criteria** | 1. Decomposes overall model drift into individual feature contribution percentages.<br>2. Identifies top-3 attributes driving prediction error divergence.<br>3. Generates structured JSON and text explanation summaries detailing drift root causes.<br>4. Analyzes feature shifts in $< 15$ms for 50 feature dimensions.<br>5. Unit tests assert attribution accuracy, feature ranking consistency, and report formatting. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/drift/drift-attribution` and `feature-contribution-analyzer`. |
| **Estimated Complexity** | Medium |

---

### Phase 6 — Edge-Native Model Inference & Quantization Engine

#### AFED-016 — Edge-Native Model Inference Engine (ONNX / WebAssembly Runtime)

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-016 |
| **Phase** | Phase 6 — Edge-Native Model Inference & Quantization Engine |
| **Description** | Implement the edge-native model inference engine in `src/lib/operations/inference/edge-inference-engine.ts`, `inference-types.ts`, and `onnx-runtime-adapter.ts`. Support loading and executing serialized neural network models (ONNX, TFLite, and WebAssembly formats) directly in client browser sessions, mobile devices, and campus edge gateways. Execute predictions locally with sub-50ms latency without transmitting input data to cloud servers. |
| **Files** | `src/lib/operations/inference/inference-types.ts` [NEW] · `src/lib/operations/inference/onnx-runtime-adapter.ts` [NEW] · `src/lib/operations/inference/edge-inference-engine.ts` [NEW] · `src/lib/__tests__/operations/inference/onnx-runtime-adapter.test.ts` [NEW] · `src/lib/__tests__/operations/inference/edge-inference-engine.test.ts` [NEW] |
| **Dependencies** | None (Core Inference Primitive) |
| **Acceptance Criteria** | 1. `EdgeInferenceEngine` loads quantized ONNX / WASM model weights and executes forward inference.<br>2. Achieves inference execution time $< 50$ms on standard edge CPU hardware for student retention and energy models.<br>3. Runs completely offline with zero network dependency once model weights are cached locally.<br>4. Memory footprint constrained to $< 50$MB RAM.<br>5. Unit tests assert tensor input preparation, forward pass prediction accuracy, latency benchmarks, and error handling. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/inference/onnx-runtime-adapter` and `edge-inference-engine`. |
| **Estimated Complexity** | High |

---

#### AFED-017 — Post-Training Quantization (INT8/FP16) & Model Pruning Pipeline

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-017 |
| **Phase** | Phase 6 — Edge-Native Model Inference & Quantization Engine |
| **Description** | Implement the post-training quantization and neural pruning pipeline in `src/lib/operations/inference/model-quantizer.ts` and `neural-pruner.ts`. Convert 32-bit floating-point (FP32) federated models into 8-bit integer (INT8) and 16-bit float (FP16) formats using symmetric and asymmetric calibration. Implement magnitude-based unstructured pruning to remove 20–40% of low-weight neural connections without loss of prediction accuracy, reducing model size by $4\times$. |
| **Files** | `src/lib/operations/inference/model-quantizer.ts` [NEW] · `src/lib/operations/inference/neural-pruner.ts` [NEW] · `src/lib/__tests__/operations/inference/model-quantizer.test.ts` [NEW] · `src/lib/__tests__/operations/inference/neural-pruner.test.ts` [NEW] |
| **Dependencies** | AFED-016 |
| **Acceptance Criteria** | 1. `ModelQuantizer` converts FP32 weight tensors to INT8 with scale factor $S = \frac{\max(w) - \min(w)}{255}$ and zero-point $Z$.<br>2. `NeuralPruner` removes lowest magnitude weights below configurable threshold $\tau$.<br>3. Reduces binary model file size by $\ge 70\%$ while retaining $\ge 98.5\%$ of baseline model accuracy.<br>4. Quantization pipeline processes 500,000 parameters in $< 50$ms.<br>5. Unit tests assert quantization numerical mapping, de-quantization error bounds, pruning sparsity ratios, and accuracy retention. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/inference/model-quantizer` and `neural-pruner`. |
| **Estimated Complexity** | Medium-High |

---

#### AFED-018 — Edge Inference Cache & Cloud Fallback Tiering Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-018 |
| **Phase** | Phase 6 — Edge-Native Model Inference & Quantization Engine |
| **Description** | Implement the edge inference cache and tiered fallback coordinator in `src/lib/operations/inference/inference-cache.ts` and `tiered-fallback-engine.ts`. Maintain an LRU prediction cache with cryptographically hashed input vectors for sub-5ms repeat lookups. When an edge model outputs low prediction confidence (e.g. softmax entropy $> 0.80$), seamlessly route the prediction request to a higher-capacity cloud ensemble model while preserving differential privacy. |
| **Files** | `src/lib/operations/inference/inference-cache.ts` [NEW] · `src/lib/operations/inference/tiered-fallback-engine.ts` [NEW] · `src/lib/__tests__/operations/inference/inference-cache.test.ts` [NEW] · `src/lib/__tests__/operations/inference/tiered-fallback-engine.test.ts` [NEW] |
| **Dependencies** | AFED-016, AFED-017 |
| **Acceptance Criteria** | 1. `InferenceCache` returns cached predictions in $< 5$ms for duplicate input embeddings with configurable TTL.<br>2. `TieredFallbackEngine` calculates prediction confidence score (entropy / margin of victory).<br>3. Automatically routes uncertain queries ($< 70\%$ confidence) to cloud fallback tier while applying local DP noise.<br>4. Maintains $> 99.9\%$ prediction availability even under edge hardware memory pressure.<br>5. Unit tests verify cache hit/miss semantics, LRU eviction, confidence threshold routing, and privacy-preserving fallback. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/inference/inference-cache` and `tiered-fallback-engine`. |
| **Estimated Complexity** | Medium |

---

### Phase 7 — Privacy-Preserving Cross-Campus Benchmarking & Institutional Analytics

#### AFED-019 — Cross-Campus Benchmarking Protocol & IPEDS/HESA Indicator Aggregator

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-019 |
| **Phase** | Phase 7 — Privacy-Preserving Cross-Campus Benchmarking & Institutional Analytics |
| **Description** | Implement the privacy-preserving cross-campus benchmarking protocol and indicator aggregator in `src/lib/operations/analytics/cross-campus-benchmarker.ts`, `analytics-types.ts`, and `institutional-indicators.ts`. Align metrics with IPEDS, HESA, and NIRF institutional reporting standards (retention rates, student-faculty ratios, energy efficiency per $m^2$, credit completion velocity). Aggregate comparative performance percentiles across multi-campus networks using SMPC secure summation without any campus revealing raw underlying student counts or financial figures. |
| **Files** | `src/lib/operations/analytics/analytics-types.ts` [NEW] · `src/lib/operations/analytics/institutional-indicators.ts` [NEW] · `src/lib/operations/analytics/cross-campus-benchmarker.ts` [NEW] · `src/lib/__tests__/operations/analytics/institutional-indicators.test.ts` [NEW] · `src/lib/__tests__/operations/analytics/cross-campus-benchmarker.test.ts` [NEW] |
| **Dependencies** | AFED-004, AFED-008 |
| **Acceptance Criteria** | 1. `CrossCampusBenchmarker` calculates relative institutional percentile ranks ($P_{10}, P_{50}, P_{90}$) across multi-campus networks.<br>2. Leverages SMPC secure sum and differential privacy to guarantee 0 raw metric leakage between competing campuses.<br>3. Implements standard IPEDS/HESA educational indicator formulas.<br>4. Computes cross-campus benchmark rankings in $< 100$ms.<br>5. Unit tests assert indicator mathematical formulas, secure ranking accuracy, confidential aggregation, and zero PII disclosure. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/analytics/institutional-indicators` and `cross-campus-benchmarker`. |
| **Estimated Complexity** | High |

---

#### AFED-020 — Federated Student Retention & Academic At-Risk Predictor

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-020 |
| **Phase** | Phase 7 — Privacy-Preserving Cross-Campus Benchmarking & Institutional Analytics |
| **Description** | Implement the federated student retention and academic risk prediction model in `src/lib/operations/analytics/retention-predictor.ts` and `student-risk-model.ts`. Train a collaborative federated classifier across campus datasets using LMS engagement telemetry, attendance records, prerequisite grade sequences, and fee payment milestones. Generate early risk probability scores ($P(\text{Drop}) \in [0.0, 1.0]$) 60–90 days prior to term completion, enabling targeted academic advising interventions while ensuring student records never leave local campus servers. |
| **Files** | `src/lib/operations/analytics/student-risk-model.ts` [NEW] · `src/lib/operations/analytics/retention-predictor.ts` [NEW] · `src/lib/__tests__/operations/analytics/student-risk-model.test.ts` [NEW] · `src/lib/__tests__/operations/analytics/retention-predictor.test.ts` [NEW] |
| **Dependencies** | AFED-001, AFED-004, AFED-016 |
| **Acceptance Criteria** | 1. `StudentRiskModel` achieves $\ge 85\%$ ROC-AUC and $\ge 80\%$ precision on early dropout identification.<br>2. Trains collaboratively across distributed campus nodes via FedAvg/FedProx with DP noise ($\epsilon \le 2.0$).<br>3. Computes on-device student risk scores in $< 10$ms with Top-3 explanatory factor tags.<br>4. Protects student privacy with strict local execution; 0 student demographic or grade vectors exported.<br>5. Unit tests verify model training convergence, risk score inference, feature importance extraction, and privacy isolation. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/analytics/student-risk-model` and `retention-predictor`. |
| **Estimated Complexity** | Medium-High |

---

#### AFED-021 — Federated Institutional Financial Forecasting & Resource Allocation Predictor

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-021 |
| **Phase** | Phase 7 — Privacy-Preserving Cross-Campus Benchmarking & Institutional Analytics |
| **Description** | Implement the federated institutional financial forecasting and resource demand predictor in `src/lib/operations/analytics/financial-forecaster.ts` and `resource-demand-model.ts`. Model multi-term enrollment tuition revenue projections, departmental operational expenditure trajectories, and specialized lab equipment utilization trends. Train collaboratively across multi-campus networks to learn macroeconomic and seasonal patterns while keeping institutional balance sheets strictly confidential. |
| **Files** | `src/lib/operations/analytics/resource-demand-model.ts` [NEW] · `src/lib/operations/analytics/financial-forecaster.ts` [NEW] · `src/lib/__tests__/operations/analytics/resource-demand-model.test.ts` [NEW] · `src/lib/__tests__/operations/analytics/financial-forecaster.test.ts` [NEW] |
| **Dependencies** | AFED-001, AFED-004, AFED-019 |
| **Acceptance Criteria** | 1. `FinancialForecaster` predicts multi-term budget variance and revenue streams with $\ge 90\%$ accuracy.<br>2. `ResourceDemandModel` forecasts departmental laboratory, classroom, and staff capacity bottlenecks 3–6 months in advance.<br>3. Employs federated training with $(\epsilon, \delta)$-DP ensuring individual campus financial transactions remain confidential.<br>4. Computes forecast projections in $< 20$ms.<br>5. Unit tests assert time-series forecasting accuracy, budget constraint evaluations, confidential federated updates, and scenario modeling. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/analytics/resource-demand-model` and `financial-forecaster`. |
| **Estimated Complexity** | Medium-High |

---

### Phase 8 — Dual-Store Persistence, Cryptographic Merkle Audit & OpenMetrics

#### AFED-022 — Dual-Store Drizzle ORM Persistence (SQLite & PostgreSQL Schema Parity)

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-022 |
| **Phase** | Phase 8 — Dual-Store Persistence, Cryptographic Merkle Audit & OpenMetrics |
| **Description** | Implement Drizzle ORM dual-store persistence for SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) across 9 new federated learning and analytics tables: (1) `afed_models` (global model registry, architectures, versions), (2) `afed_nodes` (campus edge nodes, capabilities, status), (3) `afed_training_rounds` (round parameters, participants, convergence loss), (4) `afed_model_weights` (serialized weight checkpoints, hashes, formats), (5) `afed_privacy_budgets` (tenant $\epsilon, \delta$ limits, consumed budget, resets), (6) `afed_smpc_sessions` (cryptographic session state, threshold $t$, participants), (7) `afed_drift_metrics` (KS-test scores, PSI values, detected shifts), (8) `afed_benchmarks` (anonymized institutional indicator percentiles), (9) `afed_predictions` (edge inference audit records). Build type-safe database store methods in `src/lib/operations/persistence/afed-db-store.ts`. |
| **Files** | `packages/db/schema.ts` [MODIFY] · `packages/db/schema.pg.ts` [MODIFY] · `src/lib/operations/persistence/afed-db-store.ts` [NEW] · `src/lib/__tests__/operations/persistence/afed-db-store.test.ts` [NEW] · `src/lib/__tests__/schema-parity.test.ts` [MODIFY] |
| **Dependencies** | AFED-001, AFED-004, AFED-007, AFED-013, AFED-019 |
| **Acceptance Criteria** | 1. Defines 9 new tables in both SQLite and PostgreSQL schemas with 100% field, index, and constraint parity.<br>2. All tenant operations enforce strict `institutionId` isolation.<br>3. `AfedDbStore` provides type-safe CRUD operations, pagination, and multi-round query filters.<br>4. Schema parity test (`src/lib/__tests__/schema-parity.test.ts`) passes with 0 divergence.<br>5. Unit tests assert full transaction handling, round state queries, budget updates, and tenant isolation. |
| **Verification Method** | Run `pnpm test --testPathPattern=schema-parity` and `afed-db-store`. |
| **Estimated Complexity** | Medium-High |

---

#### AFED-023 — SHA-256 Merkle Chain Audit Logging & Compliance Verification

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-023 |
| **Phase** | Phase 8 — Dual-Store Persistence, Cryptographic Merkle Audit & OpenMetrics |
| **Description** | Implement cryptographic audit logging in `src/lib/operations/persistence/afed-audit-events.ts` and integrate with the platform SHA-256 Merkle audit chain (`src/lib/security/threat-audit-events.ts`). Emit tamper-evident Merkle blocks for every federated training round completion, privacy budget consumption step, model promotion event, drift detection alert, and cross-campus benchmarking calculation. Ensure full compliance verification via `pnpm compliance:verify`. |
| **Files** | `src/lib/operations/persistence/afed-audit-events.ts` [NEW] · `src/lib/security/threat-audit-events.ts` [MODIFY] · `src/lib/__tests__/operations/persistence/afed-audit-events.test.ts` [NEW] |
| **Dependencies** | AFED-022 |
| **Acceptance Criteria** | 1. Generates deterministic SHA-256 cryptographic audit entries with previous block hash chaining.<br>2. Logs all federated model weight checksums, DP epsilon expenditures, and model promotions.<br>3. `pnpm compliance:verify` verifies 100% cryptographic integrity across all newly emitted federated blocks.<br>4. Audit emission overhead $< 2$ms per event.<br>5. Unit tests assert block structure, cryptographic hash chaining, event payload serialization, and tamper detection. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/persistence/afed-audit-events` and `pnpm compliance:verify`. |
| **Estimated Complexity** | Medium |

---

#### AFED-024 — Prometheus OpenMetrics Telemetry & Health Monitoring

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-024 |
| **Phase** | Phase 8 — Dual-Store Persistence, Cryptographic Merkle Audit & OpenMetrics |
| **Description** | Implement real-time OpenMetrics telemetry in `src/lib/operations/persistence/afed-metrics.ts` and register 8 new Prometheus metric series in `src/lib/metrics/registry.ts`: (1) `afed_training_rounds_total` (counter of completed training rounds), (2) `afed_training_loss` (gauge of global model convergence loss), (3) `afed_privacy_epsilon_consumed` (gauge of accumulated DP privacy budget), (4) `afed_participating_nodes_active` (gauge of active campus edge nodes), (5) `afed_drift_psi_score` (gauge of demographic covariate shift PSI), (6) `afed_edge_inference_duration_ms` (histogram of local inference latency), (7) `afed_smpc_session_duration_ms` (histogram of cryptographic secure aggregation time), (8) `afed_model_accuracy_ratio` (gauge of validated model prediction accuracy). |
| **Files** | `src/lib/operations/persistence/afed-metrics.ts` [NEW] · `src/lib/metrics/registry.ts` [MODIFY] · `src/lib/__tests__/operations/persistence/afed-metrics.test.ts` [NEW] |
| **Dependencies** | AFED-022 |
| **Acceptance Criteria** | 1. Registers all 8 Prometheus OpenMetrics series with standard naming, help strings, and dimension labels.<br>2. Exposes metrics via `/api/metrics` endpoint in compliant Prometheus text format.<br>3. Telemetry recording overhead $< 0.1$ms per invocation.<br>4. Real-time metric updates accurately reflect federated engine activity.<br>5. Unit tests assert metric registration, label dimensions, counter increments, histogram buckets, and scrape serialization. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/persistence/afed-metrics`. |
| **Estimated Complexity** | Medium |

---

### Phase 9 — Admin Collaborative Intelligence Radar UI, REST APIs & Simulation Harness

#### AFED-025 — RBAC-Protected REST API Suite & React Hook Ecosystem

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-025 |
| **Phase** | Phase 9 — Admin Collaborative Intelligence Radar UI, REST APIs & Simulation Harness |
| **Description** | Implement 8 RBAC-protected REST API route handlers (`requireAuth` wrapper with DPoP token verification) and 5 dedicated React custom hooks: (1) `GET/POST /api/operations/federated/models` (model management & deployment), (2) `POST /api/operations/federated/train` (trigger federated training round), (3) `GET /api/operations/federated/nodes` (campus node topology & status), (4) `GET/PATCH /api/operations/federated/privacy` (privacy budget status & limits), (5) `GET /api/operations/federated/drift` (live drift metrics & feature attribution), (6) `POST /api/operations/federated/benchmark` (trigger cross-campus benchmark calculation), (7) `POST /api/operations/federated/predict` (edge inference proxy / fallback), (8) `GET /api/operations/federated/audit` (Merkle audit log). Create hooks `useFederatedTraining`, `usePrivacyBudget`, `useDriftMonitoring`, `useEdgeInference`, and `useCampusBenchmarking`. |
| **Files** | `src/app/api/operations/federated/models/route.ts` [NEW] · `src/app/api/operations/federated/train/route.ts` [NEW] · `src/app/api/operations/federated/nodes/route.ts` [NEW] · `src/app/api/operations/federated/privacy/route.ts` [NEW] · `src/app/api/operations/federated/drift/route.ts` [NEW] · `src/app/api/operations/federated/benchmark/route.ts` [NEW] · `src/app/api/operations/federated/predict/route.ts` [NEW] · `src/app/api/operations/federated/audit/route.ts` [NEW] · `src/lib/hooks/use-federated-training.ts` [NEW] · `src/lib/hooks/use-privacy-budget.ts` [NEW] · `src/lib/hooks/use-drift-monitoring.ts` [NEW] · `src/lib/hooks/use-edge-inference.ts` [NEW] · `src/lib/hooks/use-campus-benchmarking.ts` [NEW] · `src/lib/__tests__/afed-api.test.ts` [NEW] · `src/lib/__tests__/hooks/use-federated-training.test.ts` [NEW] · `src/lib/__tests__/hooks/use-privacy-budget.test.ts` [NEW] · `src/lib/__tests__/hooks/use-drift-monitoring.test.ts` [NEW] · `src/lib/__tests__/hooks/use-edge-inference.test.ts` [NEW] · `src/lib/__tests__/hooks/use-campus-benchmarking.test.ts` [NEW] |
| **Dependencies** | AFED-001 through AFED-024 |
| **Acceptance Criteria** | 1. All 8 API endpoints enforce `requireAuth` with granular permissions (`system:federated:view`, `system:federated:manage`, `system:privacy:manage`, `system:analytics:benchmark`).<br>2. Validates request payloads with Zod schemas and returns proper HTTP status codes (200, 201, 400, 403, 404, 429).<br>3. React hooks handle loading states, optimistic updates, SWR-style caching, and error toast alerts.<br>4. Gateway route scan (`pnpm gateway:scan --strict --json`) confirms 100% route coverage with 0 unshielded endpoints.<br>5. Unit tests assert RBAC authorization, DPoP validation, parameter validation, hook state transitions, and error handling. |
| **Verification Method** | Run `pnpm test --testPathPattern=afed-api` and `hooks/use-federated`. Run `pnpm gateway:scan --strict --json`. |
| **Estimated Complexity** | High |

---

#### AFED-026 — Admin Collaborative Intelligence Radar UI, Simulation Runner & Mobile Integration

| Field | Specification Details |
|---|---|
| **Task ID** | AFED-026 |
| **Phase** | Phase 9 — Admin Collaborative Intelligence Radar UI, REST APIs & Simulation Harness |
| **Description** | Implement the full enterprise Admin Collaborative Intelligence Radar UI at `/admin/operations/federated-learning` (`src/app/(shell)/admin/operations/federated-learning/page.tsx`), automated simulation test harness (`scripts/operations/afed-simulation-runner.ts` / `pnpm afed:simulate`), Flutter Riverpod mobile models and providers (`mobile/lib/features/operations/application/federated_providers.dart`), and 5 operational runbooks in `docs/`. The UI features 5 responsive tabs: (1) **Training Radar** (live round status, convergence curves, node topology), (2) **Privacy Budget Visualizer** ($\epsilon, \delta$ meters, moments accountant curve, tenant consumption), (3) **SMPC & Mesh Topology** (peer gossip graph, secure aggregation latency, dropout resilience), (4) **Drift & Retraining Monitor** (KS-test statistics, PSI gauges, feature attribution breakdown), (5) **Cross-Campus Benchmarking** (anonymized percentile rankings, retention & financial predictors). |
| **Files** | `src/app/(shell)/admin/operations/federated-learning/page.tsx` [NEW] · `src/components/operations/federated-training-panel.tsx` [NEW] · `src/components/operations/privacy-budget-panel.tsx` [NEW] · `src/components/operations/smpc-mesh-panel.tsx` [NEW] · `src/components/operations/drift-monitor-panel.tsx` [NEW] · `src/components/operations/cross-campus-benchmark-panel.tsx` [NEW] · `scripts/operations/afed-simulation-runner.ts` [NEW] · `package.json` [MODIFY] · `mobile/lib/features/operations/application/federated_providers.dart` [NEW] · `mobile/lib/features/operations/presentation/federated_edge_scanner_screen.dart` [NEW] · `docs/federated-learning-architecture-guide.md` [NEW] · `docs/differential-privacy-budget-guide.md` [NEW] · `docs/smpc-secure-aggregation-guide.md` [NEW] · `docs/drift-detection-retraining-guide.md` [NEW] · `docs/cross-campus-benchmarking-guide.md` [NEW] · `src/lib/__tests__/afed-ui.test.tsx` [NEW] · `src/lib/__tests__/e2e-afed.test.ts` [NEW] · `mobile/test/features/operations/federated_providers_test.dart` [NEW] · `.ai/FEATURES.md` [MODIFY] · `.ai/CHANGELOG.md` [MODIFY] · `.ai/PROJECT_STATUS.md` [MODIFY] · `.ai/execution/Sprint-044-Execution-Log.md` [NEW] |
| **Dependencies** | AFED-001 through AFED-025 |
| **Acceptance Criteria** | 1. Dashboard at `/admin/operations/federated-learning` renders 5 operational tabs using design system components (`Card`, `Badge`, `Skeleton`, `Dialog`, `Alert`).<br>2. Accessibility testing (`jest-axe`) passes with 0 WCAG violations.<br>3. `pnpm afed:simulate` CLI runner executes 8 end-to-end stages (Node Registration, FedAvg Round, Byzantine Attack Defense, DP Noise Injection, Moments Accounting, SMPC SecAgg, Covariate Drift Detection, Model Retraining & Promotion) with 100% pass rate.<br>4. Flutter Riverpod providers and mobile screens pass `flutter analyze` with 0 warnings.<br>5. 5 engineering runbooks authored in `docs/` and AIOS governance logs updated. |
| **Verification Method** | Run `pnpm test --testPathPattern=afed-ui` and `e2e-afed`. Run `pnpm afed:simulate`. Run `pnpm typecheck` and `pnpm lint`. |
| **Estimated Complexity** | High |

---

## 5. Artifact Manifest & Directory Structure

```
src/lib/operations/
├── federated/
│   ├── federated-types.ts
│   ├── fed-algorithms.ts
│   ├── fed-aggregation-server.ts
│   ├── fed-node-orchestrator.ts
│   ├── fed-client-worker.ts
│   ├── byzantine-defense.ts
│   └── poisoning-detector.ts
├── privacy/
│   ├── dp-types.ts
│   ├── noise-mechanisms.ts
│   ├── differential-privacy-engine.ts
│   ├── moments-accountant.ts
│   ├── privacy-budget-manager.ts
│   ├── adaptive-gradient-clipper.ts
│   └── utility-privacy-optimizer.ts
├── crypto/
│   ├── smpc-types.ts
│   ├── secret-sharing.ts
│   ├── homomorphic-primitives.ts
│   ├── secure-aggregation.ts
│   ├── masking-vector-engine.ts
│   ├── zk-gradient-circuits.ts
│   └── zk-gradient-verifier.ts
├── mesh/
│   ├── gossip-types.ts
│   ├── peer-connection-manager.ts
│   ├── model-gossip-mesh.ts
│   ├── crdt-weight-buffer.ts
│   ├── weight-reconciliation.ts
│   ├── topk-sparsifier.ts
│   └── gradient-compressor.ts
├── drift/
│   ├── drift-types.ts
│   ├── statistical-drift-detector.ts
│   ├── covariate-shift-monitor.ts
│   ├── retraining-pipeline.ts
│   ├── model-promotion-validator.ts
│   ├── drift-attribution.ts
│   └── feature-contribution-analyzer.ts
├── inference/
│   ├── inference-types.ts
│   ├── onnx-runtime-adapter.ts
│   ├── edge-inference-engine.ts
│   ├── model-quantizer.ts
│   ├── neural-pruner.ts
│   ├── inference-cache.ts
│   └── tiered-fallback-engine.ts
├── analytics/
│   ├── analytics-types.ts
│   ├── institutional-indicators.ts
│   ├── cross-campus-benchmarker.ts
│   ├── student-risk-model.ts
│   ├── retention-predictor.ts
│   ├── resource-demand-model.ts
│   └── financial-forecaster.ts
└── persistence/
    ├── afed-db-store.ts
    ├── afed-audit-events.ts
    └── afed-metrics.ts

src/app/api/operations/federated/
├── models/route.ts
├── train/route.ts
├── nodes/route.ts
├── privacy/route.ts
├── drift/route.ts
├── benchmark/route.ts
├── predict/route.ts
└── audit/route.ts

src/app/(shell)/admin/operations/federated-learning/
└── page.tsx

src/components/operations/
├── federated-training-panel.tsx
├── privacy-budget-panel.tsx
├── smpc-mesh-panel.tsx
├── drift-monitor-panel.tsx
└── cross-campus-benchmark-panel.tsx

src/lib/hooks/
├── use-federated-training.ts
├── use-privacy-budget.ts
├── use-drift-monitoring.ts
├── use-edge-inference.ts
└── use-campus-benchmarking.ts

src/lib/__tests__/operations/
├── federated/
│   ├── fed-algorithms.test.ts
│   ├── fed-aggregation-server.test.ts
│   ├── fed-node-orchestrator.test.ts
│   ├── fed-client-worker.test.ts
│   ├── byzantine-defense.test.ts
│   └── poisoning-detector.test.ts
├── privacy/
│   ├── noise-mechanisms.test.ts
│   ├── differential-privacy-engine.test.ts
│   ├── moments-accountant.test.ts
│   ├── privacy-budget-manager.test.ts
│   ├── adaptive-gradient-clipper.test.ts
│   └── utility-privacy-optimizer.test.ts
├── crypto/
│   ├── secret-sharing.test.ts
│   ├── homomorphic-primitives.test.ts
│   ├── secure-aggregation.test.ts
│   ├── masking-vector-engine.test.ts
│   └── zk-gradient-verifier.test.ts
├── mesh/
│   ├── model-gossip-mesh.test.ts
│   ├── peer-connection-manager.test.ts
│   ├── crdt-weight-buffer.test.ts
│   ├── weight-reconciliation.test.ts
│   ├── topk-sparsifier.test.ts
│   └── gradient-compressor.test.ts
├── drift/
│   ├── statistical-drift-detector.test.ts
│   ├── covariate-shift-monitor.test.ts
│   ├── retraining-pipeline.test.ts
│   ├── model-promotion-validator.test.ts
│   ├── drift-attribution.test.ts
│   └── feature-contribution-analyzer.test.ts
├── inference/
│   ├── onnx-runtime-adapter.test.ts
│   ├── edge-inference-engine.test.ts
│   ├── model-quantizer.test.ts
│   ├── neural-pruner.test.ts
│   ├── inference-cache.test.ts
│   └── tiered-fallback-engine.test.ts
├── analytics/
│   ├── institutional-indicators.test.ts
│   ├── cross-campus-benchmarker.test.ts
│   ├── student-risk-model.test.ts
│   ├── retention-predictor.test.ts
│   ├── resource-demand-model.test.ts
│   └── financial-forecaster.test.ts
└── persistence/
    ├── afed-db-store.test.ts
    ├── afed-audit-events.test.ts
    └── afed-metrics.test.ts

src/lib/__tests__/
├── afed-api.test.ts
├── afed-ui.test.tsx
└── e2e-afed.test.ts

src/lib/__tests__/hooks/
├── use-federated-training.test.ts
├── use-privacy-budget.test.ts
├── use-drift-monitoring.test.ts
├── use-edge-inference.test.ts
└── use-campus-benchmarking.test.ts

scripts/operations/
└── afed-simulation-runner.ts

docs/
├── federated-learning-architecture-guide.md
├── differential-privacy-budget-guide.md
├── smpc-secure-aggregation-guide.md
├── drift-detection-retraining-guide.md
└── cross-campus-benchmarking-guide.md

mobile/lib/features/operations/
├── presentation/
│   └── federated_edge_scanner_screen.dart
└── application/
    └── federated_providers.dart

mobile/test/features/operations/
└── federated_providers_test.dart

.ai/execution/
└── Sprint-044-Execution-Log.md
```

### Existing Files to Modify

```
packages/db/schema.ts                         (add afed_models, afed_nodes, afed_training_rounds, afed_model_weights, afed_privacy_budgets, afed_smpc_sessions, afed_drift_metrics, afed_benchmarks, afed_predictions)
packages/db/schema.pg.ts                      (add PostgreSQL parity tables for A-FED operations)
src/lib/security/threat-audit-events.ts       (re-export A-FED audit event creators)
src/lib/metrics/registry.ts                   (register 8 new Prometheus OpenMetrics series)
package.json                                  (add afed:simulate script definition)
.ai/FEATURES.md                               (register Sprint-044 features)
.ai/CHANGELOG.md                              (document v3.28.0 release notes)
.ai/PROJECT_STATUS.md                         (update current sprint status and feature registry)
```

---

## 6. Security, RBAC & Compliance Framework

### RBAC Permissions

| Permission String | Role Access | Description |
|---|---|---|
| `system:federated:view` | `super_admin`, `admin`, `principal` | Read-only access to federated model catalog, training round telemetry, drift metrics, and cross-campus benchmarking percentiles. |
| `system:federated:manage` | `super_admin`, `admin` | Full management access to initiate federated training rounds, register edge nodes, configure aggregation algorithms, and promote validated models. |
| `system:privacy:manage` | `super_admin` (Privacy Officer) | Allocate and adjust institutional $\epsilon, \delta$ differential privacy budgets, configure noise mechanisms, and execute emergency privacy halts. |
| `system:analytics:benchmark` | `super_admin`, `admin`, `principal` | Access confidential cross-campus benchmarking scores and export anonymized institutional comparison reports. |

### Compliance & Cryptographic Controls
- **Differential Privacy ($\epsilon, \delta$-DP):** Formally certified $(\epsilon, \delta)$ mathematical privacy guarantees bounding privacy loss per query and training round; strictly prevents database reconstruction attacks and membership inference.
- **Secure Multi-Party Computation (SMPC):** 4-round SecAgg protocol guarantees that the coordinator server observes only the aggregate sum $\sum x_k$ and never raw individual campus model parameters or gradients.
- **Zero-Knowledge Proofs (zk-SNARKs):** Mathematical verification of gradient clipping bounds and participant eligibility without exposing model weights.
- **Data Sovereignty by Design:** 100% of raw student records, transcripts, biometric templates, and financial ledgers remain strictly within local campus infrastructure; zero raw records are ever transmitted over external networks.
- **SHA-256 Merkle Chain Integrity:** Every training round hash, privacy budget debit, and model promotion decision is committed to the SHA-256 Merkle audit chain with verification via `pnpm compliance:verify`.

---

## 7. Risk Register & Mitigation Strategy

| Risk ID | Category | Risk Description | Severity | Probability | Mitigation Strategy |
|---|---|---|---|---|---|
| **R-044-1** | Convergence / Non-IID | Heterogeneous cross-campus data distributions cause federated training divergence or model oscillation | High | Medium | Implement FedProx with configurable proximal penalty $\mu$ and adaptive learning rate decay to stabilize local client gradient updates. |
| **R-044-2** | Adversarial / Poisoning | Malicious or faulty edge nodes submit corrupted gradient vectors to poison the global model | High | Low | Deploy Multi-Krum, Coordinate-wise Median, and Trimmed Mean Byzantine-resilient aggregation filters with zk-SNARK gradient clipping validation. |
| **R-044-3** | Privacy / Budget Depletion | Excessive federated training rounds exhaust tenant $\epsilon$ privacy budget, blocking further model updates | High | Low | Implement Moments Accountant RDP composition for tight privacy accounting and automated utility-privacy hyperparameter optimizer. |
| **R-044-4** | Cryptographic / Dropout | Large-scale edge node dropouts during SMPC SecAgg round stall model aggregation | Medium | Medium | Implement threshold Shamir secret sharing allowing unmasking and successful aggregation as long as $\ge t$ of $n$ participants respond. |
| **R-044-5** | Network / WAN Bandwidth | Large model weight vector synchronization creates network congestion across WAN connections | Medium | Low | Deploy Top-K sparsification ($\ge 85\%$ payload reduction) and 8-bit quantization with Error Feedback memory compensation. |
| **R-044-6** | Drift / False Alarms | Noisy statistical drift detectors trigger unnecessary and expensive automated retraining rounds | Medium | Low | Combine multiple statistical tests (KS-test, PSI, Wasserstein) with consecutive window verification before initiating retraining. |

---

## 8. Rollback Plan

### Rollback Trigger Criteria
- Global model validation loss diverges ($> 30\%$ degradation compared to baseline) during 3 consecutive federated rounds.
- Differential privacy budget consumption rate exceeds projected bounds by $> 50\%$.
- SMPC secure aggregation latency exceeds 10 seconds per round across 3 consecutive rounds.
- Edge inference engine memory footprint exceeds 100MB RAM or causes client browser crashes.

### Rollback Execution Steps

```bash
# Step 1: Emergency Federated Training Halt (< 10 seconds)
# Immediately halts all active federated training rounds and gossip synchronization
pnpm tsx scripts/operations/afed-simulation-runner.ts --emergency-halt-all

# Step 2: Disable Federated Engine via Environment Flags (< 30 seconds)
AFED_TRAINING_ENABLED=false
AFED_GOSSIP_MESH_ENABLED=false
AFED_DRIFT_AUTORETRAIN_ENABLED=false
AFED_EDGE_INFERENCE_ENABLED=true # Keep local inference active using last validated checkpoint

# Step 3: Revert Global Model to Last Validated Checkpoint (< 1 minute)
pnpm tsx scripts/operations/afed-simulation-runner.ts --rollback-model-to-v327

# Step 4: Revert Source Code & Database Migrations (if necessary) (< 5 minutes)
git revert --no-edit HEAD
pnpm build

# Step 5: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 9. Definition of Done

A Sprint-044 task is considered **COMPLETE** when all of the following gates are met:

### Code Quality & Standards
- [ ] `pnpm typecheck` (`pnpm tsc --noEmit`) passes with 0 TypeScript errors across `src/`, `packages/auth`, and `packages/db`.
- [ ] `pnpm lint` passes with 0 errors and 0 new warnings.
- [ ] `flutter analyze` passes with 0 errors and 0 warnings in `mobile/`.
- [ ] Zero `console.log` statements in production source code (`src/`, `packages/`, `mobile/`).
- [ ] No hardcoded API keys, private keys, secrets, or disabled security flags.
- [ ] Complete TypeScript interfaces and JSDoc annotations on all exported types, classes, and handlers.

### Testing & Verification
- [ ] Unit tests authored for every new module with $\ge 90\%$ code coverage.
- [ ] All Jest test suites pass: `pnpm test` $\to$ 100% pass rate.
- [ ] `pnpm gateway:scan --strict --json` $\to$ 100% route coverage verified with 0 unshielded endpoints.
- [ ] `pnpm compliance:scan` $\to$ 100% compliance audit coverage across all mutation endpoints.
- [ ] `pnpm compliance:verify` $\to$ Cryptographic Merkle audit chain verified intact.
- [ ] `pnpm security:tenants` $\to$ 0 cross-tenant isolation leaks across all files.
- [ ] `schema-parity.test.ts` $\to$ 100% schema parity confirmed between SQLite and PostgreSQL.
- [ ] `pnpm afed:simulate` $\to$ All 8 federated learning simulation scenarios pass with 100% success.

### Security & RBAC
- [ ] All new A-FED API routes protected with `requireAuth` and granular permissions (`system:federated:view`, `system:federated:manage`, `system:privacy:manage`, `system:analytics:benchmark`).
- [ ] DPoP cryptographic proof of possession validated on all admin mutation endpoints.
- [ ] Differential privacy bounds ($\epsilon, \delta$) and SMPC SecAgg mathematical guarantees verified.

### Documentation & Governance
- [ ] 5 operational runbooks created in `docs/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-044 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.28.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with Sprint-044 deliverables.
- [ ] `.ai/execution/Sprint-044-Execution-Log.md` initialized with all 26 tasks.

---

## 10. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-044 |
| **Sprint Name** | Autonomous Federated Edge Learning & Decentralized Cross-Campus Institutional Analytics (A-FED / EdgeMesh) |
| **Target Release Version** | v3.28.0 |
| **Total Implementation Tasks** | 26 (AFED-001 through AFED-026) |
| **Estimated Sprint Duration** | 15–17 engineering days |
| **Estimated Complexity** | Large |
| **Predecessor Sprint** | SPRINT-043 (v3.27.0 — Autonomous Intelligence & Multi-Agent Smart Campus System — AIMS / AutoOps) |
| **Successor Artifact** | `.ai/execution/Sprint-044-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-044.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-20*  
*ThaibaHive Institution OS — Sprint-044 v3.28.0 Engineering Lifecycle*
