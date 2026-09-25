# Sprint-053 Architecture: NEURO-CLUSTER / ResearchCompute OS
**Autonomous Research Computing & High-Performance AI Cluster Orchestrator**

---

## 1. Executive Summary

Sprint-053 delivers **NEURO-CLUSTER / ResearchCompute OS**, transforming ThaibaHive into a tier-1 research supercomputing university platform. It unifies heterogeneous on-premise compute nodes (NVIDIA H100/A100 SXM5 with NVLink meshes and InfiniBand fabrics) with multi-cloud spot arbitrage across AWS, GCP, and RunPod, backed by W3C PROV-O dataset provenance and NSF/NIH-compliant double-entry compute accounting.

---

## 2. Core Subsystems

### 2.1 Multi-Tenant GPU Scheduler & Fair-Share Quotas
- **Decayed Usage Half-Life**: Tracks past compute usage per department using exponential decay $\lambda = 0.95$.
- **Fair-Share Ratio**: $S_i = \frac{W_i}{U_i + 1.0}$ boosts priority for underutilized departments.
- **Topology-Aware Gang-Scheduling**: All-or-nothing atomic placement prioritizing single-node NVLink mesh (Score 1.0) and intra-rack InfiniBand (Score 0.85).

### 2.2 Hybrid Cloud Spot Arbitrage & Preemption Resilience
- **Real-Time Price Broker**: Normalizes spot prices vs on-demand rates across AWS (`p5.48xlarge`), GCP (`a3-highgpu-8g`), RunPod, and On-Premise.
- **2-Minute Preemption Interception**: Automatically catches termination notices, initiates asynchronous emergency checkpoint flush ($< 90$s), drains nodes, and reschedules jobs with high priority.

### 2.3 Carbon-Aware NetZero Compute Synergy
- **Microgrid Telemetry Integration**: Reads campus solar generation and base load to schedule flexible batch jobs during net renewable surplus ($100\%$ solar power).
- **Green Compute Certification**: Quantifies avoided carbon emissions ($kg\text{ CO}_2e$) per job.

### 2.4 Cryptographic Dataset Lineage & NSF/NIH Provenance
- **Binary Merkle DAG**: Computes deterministic SHA-256 tree hashes for multi-terabyte dataset files and generates cryptographic inclusion proofs.
- **W3C PROV-O JSON-LD**: Formats entities, activities, and agents for audit dossiers.

### 2.5 Tokenized Compute Metering & Double-Entry Ledger
- **GPU Model Rate Cards**:
  - NVIDIA H100: 8 tokens / GPU-hr
  - NVIDIA A100: 4 tokens / GPU-hr
  - NVIDIA L40S: 2 tokens / GPU-hr
- **Budget Enforcements**: Triggers soft-cap warning ($80\%$) and hard-cap execution lock ($100\%$) with strict debit/credit reconciliation.

---

## 3. Database Schema (14 Tables)

1. `neuro_clusters`
2. `neuro_nodes`
3. `neuro_gpus`
4. `neuro_jobs`
5. `neuro_job_checkpoints`
6. `neuro_fair_share_quotas`
7. `neuro_cloud_providers`
8. `neuro_spot_price_history`
9. `neuro_dataset_provenance`
10. `neuro_merkle_lineage_nodes`
11. `neuro_compute_billing_accounts`
12. `neuro_grant_credit_allocations`
13. `neuro_billing_ledger_transactions`
14. `neuro_audit_logs`

---

## 4. API Endpoints

- `GET / POST /api/neuro/clusters`
- `GET / POST /api/neuro/nodes`
- `GET / POST /api/neuro/gpus`
- `GET / POST /api/neuro/jobs`
- `GET / PATCH /api/neuro/jobs/[id]`
- `GET / POST /api/neuro/scheduler`
- `GET / POST /api/neuro/cloud/arbitrage`
- `GET / POST /api/neuro/provenance`
- `GET / POST /api/neuro/billing`
- `GET /api/neuro/metrics` (OpenMetrics 1.0)
- `GET /api/neuro/stream` (SSE live logs)
