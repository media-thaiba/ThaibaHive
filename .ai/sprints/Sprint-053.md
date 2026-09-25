# Engineering Contract — Sprint-053

**Sprint ID:** SPRINT-053  
**Sprint Name:** Autonomous Research Computing & High-Performance AI Cluster Orchestrator (NEURO-CLUSTER / ResearchCompute OS)  
**Target Release Version:** v3.37.0  
**Contract Date:** 2026-08-21  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-053-Recommendation.md`  
**Review Status:** ✅ Reviewed and Aligned with AIOS Engineering Guide, Architecture Lead & Research Infrastructure Standards  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, system architecture, task decomposition, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-053**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Following the successful delivery of the **Physical Campus Intelligence Triad** (TWIN-OPS / SpatialGrid v3.32.0, ECO-MESH / NetZeroOS v3.33.0, VISION-SHIELD / SafeCampus OS v3.34.0, FACILITY-MIND / SmartCampus OS v3.36.0) and the **Cognitive Academic Triad** (KM-COPILOT v3.31.0, ADVISE-MESH / CognitiveDegree OS v3.35.0), ThaibaHive reaches its final major institutional frontier: **High-Performance Autonomous Research Computing**:

$$\text{Autonomous Institution OS} = \underbrace{\text{Campus Operations Quad}}_{\text{TWIN-OPS} \times \text{ECO-MESH} \times \text{VISION-SHIELD} \times \text{FACILITY-MIND}} \times \underbrace{\text{Academic Triad}}_{\text{CORE} \times \text{KM-COPILOT} \times \text{ADVISE-MESH}} \times \underbrace{\text{NEURO-CLUSTER (ResearchCompute OS)}}_{\text{Sprint-053 High-Performance Core}}$$

Sprint-053 establishes **NEURO-CLUSTER / ResearchCompute OS** — an autonomous multi-tenant GPU cluster orchestrator, hybrid cloud spot instance arbitrage engine, cryptographic dataset provenance ledger, and tokenized research compute billing system. It delivers:
1. **Multi-Tenant GPU Cluster Scheduler & Fair-Share Quota Engine**: Intelligent job scheduler abstracting on-premise hardware (NVIDIA H100, A100, L40S) and cloud clusters with departmental fair-share quotas, priority preemption, multi-GPU topology awareness (NVLink, InfiniBand NUMA affinity), and gang-scheduling for distributed training jobs.
2. **Hybrid Cloud Spot Arbitrage & Workload Migration Engine**: Real-time spot price aggregator monitoring AWS EC2, GCP Compute Engine, and RunPod; automated spot instance procurement, cost-optimal job placement, transparent checkpoint/resume migration upon cloud spot preemption notice (2-minute warning), and carbon-aware scheduling via ECO-MESH.
3. **Cryptographic Dataset Lineage & Scientific Provenance Engine**: SHA-256 Merkle DAG anchoring research training datasets, hyperparameters, model weights, and compute logs into immutable cryptographic audit proofs compliant with NSF/NIH scientific reproducibility requirements.
4. **Tokenized Departmental Compute Billing & Grant Allocation Ledger**: Real-time compute metering (GPU-hour tokenization, VRAM bandwidth, egress), grant budget ceiling enforcement with automated soft/hard caps, and dual-entry billing ledger transactions linked with the platform finance engine.
5. **Real-Time Cluster Telemetry Streaming & Prometheus OpenMetrics**: Authenticated Server-Sent Events (SSE) and WebSocket channels streaming live GPU metrics (utilization, VRAM consumption, temperature, power draw, SM clock), job queue states, and 10 standardized Prometheus OpenMetrics series.
6. **Admin Research Cluster Cockpit (`/admin/operations/neuro-cluster`)**: 5-tab administrative command studio: (1) Cluster & Node Topology Studio, (2) Job Queue & Scheduler Radar, (3) Hybrid Cloud & Spot Arbitrage Matrix, (4) Dataset Lineage & Compliance Vault, and (5) Grant Billing & Quota Ledger.
7. **Researcher Launchpad Portal (`/portal/research-compute`)**: Self-service researcher portal with interactive Jupyter notebook session launching, distributed job submission wizard, live telemetry inspector, and grant budget spend tracker.
8. **Flutter Mobile Research Companion**: Mobile-first application for researchers and cluster admins with Riverpod state management: live job status tracking, spot price volatility alerts, job pause/cancel controls, and push notifications for training completion.
9. **End-to-End Simulation CLI Harness (`pnpm neuro:simulate`)**: 8-stage automated simulation runner verifying cluster provisioning, fair-share scheduling, spot price arbitrage & failover, checkpoint/resume, dataset lineage Merkle proof, grant billing debit, and compliance verification.
10. **Operational Documentation & Runbooks**: 5 comprehensive engineering guides and standard operating runbooks in `docs/operations/`.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|---|---|
| 1 | **Dual-Store Research Compute Schema** | 14 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `neuro_clusters`, `neuro_nodes`, `neuro_gpus`, `neuro_jobs`, `neuro_job_checkpoints`, `neuro_fair_share_quotas`, `neuro_cloud_providers`, `neuro_spot_price_history`, `neuro_dataset_provenance`, `neuro_merkle_lineage_nodes`, `neuro_compute_billing_accounts`, `neuro_grant_credit_allocations`, `neuro_billing_ledger_transactions`, and `neuro_audit_logs`. |
| 2 | **Multi-Tenant GPU Cluster Scheduler Engine** | Multi-tenant job scheduler supporting SLURM/Kubernetes abstractions, fair-share quota algorithm (decayed usage tracking), priority preemption, gang-scheduling for multi-node distributed training, and NUMA/NVLink topology awareness. |
| 3 | **Hybrid Cloud Spot Arbitrage & Workload Migration** | Automated spot price tracking across AWS, GCP, and RunPod; automated spot instance procurement, workload placement optimization, 2-minute preemption signal handling, and automated checkpoint/resume migration. |
| 4 | **Carbon-Aware Compute Scheduling (ECO-MESH Synergy)** | Integration with ECO-MESH microgrid telemetry to schedule non-urgent batch training jobs during peak solar/renewable generation windows and low grid carbon intensity periods. |
| 5 | **Cryptographic Dataset Lineage & Scientific Provenance** | Immutable SHA-256 Merkle DAG anchoring raw datasets, preprocessing scripts, model architectures, hyperparameters, and checkpoint weights with cryptographic inclusion proofs for NSF/NIH grant audit compliance. |
| 6 | **Tokenized Compute Billing & Grant Allocation Ledger** | Granular billing engine tracking GPU-seconds, VRAM, and cloud egress; tokenized credit accounts tied to institutional grant numbers; automated budget caps and overage protection with double-entry ledger entries. |
| 7 | **Real-Time Telemetry Streaming & Prometheus OpenMetrics** | Authenticated SSE stream for live GPU/job telemetry and 10 Prometheus OpenMetrics series (`neuro_gpu_utilization_percent`, `neuro_jobs_queued_total`, `neuro_cloud_cost_hourly_usd`, `neuro_spot_arbitrage_savings_total`, etc.). |
| 8 | **RBAC Protected REST API Gateway Suite** | Granular RBAC-shielded endpoints (`requireAuth`) for cluster management, node operations, job submission/lifecycle, spot arbitrage configuration, dataset lineage queries, and billing transactions. |
| 9 | **Admin Research Cluster Cockpit (`/admin/operations/neuro-cluster`)** | 5-tab Next.js command studio: Cluster & Node Topology Studio, Job Queue & Scheduler Radar, Hybrid Cloud & Spot Arbitrage Matrix, Dataset Lineage & Compliance Vault, and Grant Billing & Quota Ledger. |
| 10 | **Researcher Launchpad Portal (`/portal/research-compute`)** | Interactive researcher portal for Jupyter notebook launching, batch/distributed training job submission, real-time stdout/stderr log streaming, and personal grant budget monitoring. |
| 11 | **TWIN-OPS 3D Datacenter Digital Twin Overlay** | Integration with TWIN-OPS 3D spatial viewer to render datacenter server racks, node thermal contours, GPU power load, and rack-level airflow indicators. |
| 12 | **Flutter Mobile Research Companion** | Mobile Flutter module (`mobile/lib/features/research_compute/`) with Riverpod state management: active job monitors, spot price volatility alerts, job pause/cancel controls, and push notifications. |
| 13 | **End-to-End Simulation CLI Harness (`pnpm neuro:simulate`)** | 8-stage automated CLI test harness executing realistic cluster job submission, fair-share preemption, spot price arbitrage, checkpoint recovery, dataset lineage verification, and grant debit ledger accounting. |
| 14 | **Operational Documentation & Runbooks** | 5 comprehensive engineering guides and standard operating runbooks in `docs/operations/`. |

---

### Out of Scope

| Area | Justification |
|---|---|
| Direct ASIC / Silicon Firmware Flashing | NEURO-CLUSTER orchestrates compute workloads via standard containerized drivers (NVIDIA CUDA, ROCm); physical GPU BIOS/VBIOS firmware flashing remains manual hardware vendor maintenance. |
| Proprietary Cloud Provider Payment Processing | The system calculates internal tokenized grant debits and cloud cost estimates; actual external cloud vendor invoices (AWS/GCP credit cards/invoices) are settled via institutional procurement. |
| Custom Physical Supercomputer Interconnect Hardware Manufacturing | The system manages high-performance interconnects (InfiniBand, RoCE, Slingshot) via software abstractions and topology graphs; physical optical cabling is installed by datacenter engineers. |
| Nuclear / Quantum Computing Physical Interface | Physical qubit cryogenic control systems operate under isolated specialized quantum lab controllers outside standard HPC GPU clustering paradigms. |
| Classified National Defense Weaponry Modeling | Military-grade classified weapons simulation requires air-gapped sovereign military clearance infrastructure outside standard university academic research infrastructure. |

---

## 3. Technical Architecture & Component Interactions

```mermaid
flowchart TD
    subgraph Client Presentation Layer
        ADMIN_COCKPIT[Admin Cluster Cockpit\n/admin/operations/neuro-cluster]
        RESEARCHER_PORTAL[Researcher Launchpad\n/portal/research-compute]
        TWIN_3D_DC[TWIN-OPS 3D Datacenter\nServer Rack & Thermal Overlay]
        MOBILE_APP[Flutter Mobile Research Hub\nJob Monitor & Push Alerts]
    end

    subgraph API Gateway & Authentication
        API_GATEWAY[Secure RBAC API Gateway\nrequireAuth + Zod Validation]
        SSE_STREAM[Real-Time SSE Stream Manager\nLive Telemetry & Logs]
    end

    ADMIN_COCKPIT <--> API_GATEWAY
    RESEARCHER_PORTAL <--> API_GATEWAY
    MOBILE_APP <--> API_GATEWAY
    API_GATEWAY --> SSE_STREAM
    SSE_STREAM --> ADMIN_COCKPIT
    SSE_STREAM --> RESEARCHER_PORTAL
    SSE_STREAM --> MOBILE_APP

    subgraph Core Orchestration Engine (NEURO-CLUSTER)
        SCHEDULER[Multi-Tenant GPU Scheduler\nFair-Share & Gang Scheduling]
        TOPOLOGY_MGR[Hardware Topology Manager\nNVLink & NUMA Affinity]
        SPOT_ENGINE[Hybrid Cloud Spot Arbitrage\nPrice Aggregator & Workload Placer]
        CHECKPOINT_MGR[Checkpoint & Preemption Handler\nZero-Loss Job Recovery]
        PROVENANCE_ENGINE[Cryptographic Dataset Lineage\nSHA-256 Merkle DAG]
        BILLING_ENGINE[Tokenized Grant Billing Engine\nDual-Entry Compute Ledger]
    end

    API_GATEWAY <--> SCHEDULER
    SCHEDULER <--> TOPOLOGY_MGR
    SCHEDULER <--> SPOT_ENGINE
    SPOT_ENGINE <--> CHECKPOINT_MGR
    SCHEDULER --> PROVENANCE_ENGINE
    SCHEDULER --> BILLING_ENGINE

    subgraph Cross-Subsystem Mesh Integration
        ECO_MESH[ECO-MESH NetZeroOS\nRenewable Energy & Carbon Signals] <--> SCHEDULER
        FINANCE_MODULE[Finance Module\nGrant Ledger & Purchase Orders] <--> BILLING_ENGINE
        TWIN_OPS[TWIN-OPS Spatial Twin\nServer Rack Coordinate Graph] <--> TWIN_3D_DC
    end

    subgraph Compute Infrastructure Abstraction
        ON_PREM_CLUSTER[On-Premise GPU Nodes\nNVIDIA H100 / A100 / L40S]
        CLOUD_AWS[AWS EC2 Spot Instances]
        CLOUD_GCP[GCP Compute Engine Spot]
        CLOUD_RUNPOD[RunPod GPU Community/Secure Cloud]
    end

    SCHEDULER <--> ON_PREM_CLUSTER
    SPOT_ENGINE <--> CLOUD_AWS
    SPOT_ENGINE <--> CLOUD_GCP
    SPOT_ENGINE <--> CLOUD_RUNPOD

    subgraph Persistence & Audit Layer
        STORE[Neuro Cluster Store Layer]
        DB[(Dual-Store Database\nSQLite Dev / PostgreSQL Prod)]
        MERKLE[Merkle Audit Trail Anchor\npnpm compliance:verify]
        OPENMETRICS[Prometheus OpenMetrics Exporter\n10 Standard Telemetry Series]
    end

    SCHEDULER --> STORE
    PROVENANCE_ENGINE --> STORE
    BILLING_ENGINE --> STORE
    STORE <--> DB
    PROVENANCE_ENGINE --> MERKLE
    STORE --> OPENMETRICS
```

---

## 4. Implementation Task Breakdown

Tasks are decomposed into 10 logical implementation phases in strict dependency order. Foundational database schemas, cluster data access layer, and scheduling algorithms MUST be implemented and tested before building spot arbitrage engines, UI dashboards, and simulation runners.

---

### Phase 1 — Dual-Store Research Compute Persistence Layer

#### NEURO-001 — Dual-Store Drizzle ORM Schemas for Research Computing & GPU Clusters
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-001 |
| **Phase** | Phase 1 — Dual-Store Research Compute Persistence Layer |
| **Description** | Define 14 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `neuro_clusters`, `neuro_nodes`, `neuro_gpus`, `neuro_jobs`, `neuro_job_checkpoints`, `neuro_fair_share_quotas`, `neuro_cloud_providers`, `neuro_spot_price_history`, `neuro_dataset_provenance`, `neuro_merkle_lineage_nodes`, `neuro_compute_billing_accounts`, `neuro_grant_credit_allocations`, `neuro_billing_ledger_transactions`, and `neuro_audit_logs`. |
| **Files** | `packages/db/schema.ts` [MODIFY] · `packages/db/schema.pg.ts` [MODIFY] · `src/lib/__tests__/db/neuro-schema-parity.test.ts` [NEW] |
| **Dependencies** | None (Foundational Persistence Layer) |
| **Acceptance Criteria** | 1. All 14 tables declared with complete column parity, foreign keys, and indexes across SQLite and PostgreSQL.<br>2. Full support for cluster node architectures, GPU topology models, job lifecycle states, checkpoint hashes, spot price time-series, Merkle DAG lineage nodes, grant budget ceilings, and double-entry transaction ledgers.<br>3. Parity test validates matching column names, nullability, data types, and index constraints with 100% pass rate. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/neuro-schema-parity.test.ts`. |
| **Estimated Complexity** | Medium |

#### NEURO-002 — Research Compute Store Data Access Layer & Multi-Tenant Isolation
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-002 |
| **Phase** | Phase 1 — Dual-Store Research Compute Persistence Layer |
| **Description** | Implement `src/lib/db/neuro-store.ts` and `src/lib/operations/neuro/neuro-types.ts`. Implement transactional CRUD helper methods for clusters, compute nodes, GPU resources, training jobs, checkpoints, departmental quotas, cloud provider configs, dataset lineage nodes, grant billing accounts, and transaction ledgers with strict multi-tenant isolation. |
| **Files** | `src/lib/operations/neuro/neuro-types.ts` [NEW] · `src/lib/db/neuro-store.ts` [NEW] · `src/lib/__tests__/db/neuro-store.test.ts` [NEW] |
| **Dependencies** | NEURO-001 |
| **Acceptance Criteria** | 1. Provides strongly typed CRUD operations for all 14 research compute entities with mandatory `institutionId` scoping.<br>2. Supports high-throughput batch insertion of GPU telemetry readings and atomic job state transitions.<br>3. Implements pagination, status filtering, departmental quota querying, and relation preloading.<br>4. Comprehensive unit test suite confirms 100% transaction integrity and multi-tenant isolation. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/neuro-store.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — Multi-Tenant GPU Scheduler & Fair-Share Quota Engine

#### NEURO-003 — Multi-Tenant GPU Cluster Scheduler & Fair-Share Allocation Algorithm
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-003 |
| **Phase** | Phase 2 — Multi-Tenant GPU Scheduler & Fair-Share Quota Engine |
| **Description** | Implement `src/lib/operations/neuro/scheduler/gpu-scheduler-engine.ts` and `src/lib/operations/neuro/scheduler/fair-share-calculator.ts`. Implements multi-tenant job queuing, priority sorting, decayed historical usage calculation (half-life decay factor $\lambda$), fair-share share ratio calculation ($S_i = \frac{U_{\text{target}}}{U_{\text{actual}} + \epsilon}$), and dynamic priority boosting for underutilized departments. |
| **Files** | `src/lib/operations/neuro/scheduler/gpu-scheduler-engine.ts` [NEW] · `src/lib/operations/neuro/scheduler/fair-share-calculator.ts` [NEW] · `src/lib/operations/neuro/scheduler/scheduler-types.ts` [NEW] · `src/lib/__tests__/operations/neuro/gpu-scheduler-engine.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002 |
| **Acceptance Criteria** | 1. Implements fair-share priority ranking supporting SLURM-style decayed historical usage metrics.<br>2. Accurately ranks queued jobs based on Department Quota Weight + Job Priority + Wait Time Boost.<br>3. Enforces hard maximum concurrent GPU allocations per department.<br>4. Handles scheduling queue evaluations in $< 15$ms for queues up to 1,000 pending jobs. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/gpu-scheduler-engine.test.ts`. |
| **Estimated Complexity** | High |

#### NEURO-004 — Topology-Aware Placement & Gang-Scheduling Engine
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-004 |
| **Phase** | Phase 2 — Multi-Tenant GPU Scheduler & Fair-Share Quota Engine |
| **Description** | Implement `src/lib/operations/neuro/scheduler/topology-placer.ts` and `src/lib/operations/neuro/scheduler/gang-scheduler.ts`. Evaluates NVLink mesh topologies, PCIe switch boundaries, InfiniBand rail alignments, and NUMA node affinities to place distributed multi-GPU training jobs on optimal node groupings, maximizing inter-GPU communication bandwidth and minimizing cross-switch latency. |
| **Files** | `src/lib/operations/neuro/scheduler/topology-placer.ts` [NEW] · `src/lib/operations/neuro/scheduler/gang-scheduler.ts` [NEW] · `src/lib/__tests__/operations/neuro/topology-placer.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-003 |
| **Acceptance Criteria** | 1. Solves multi-GPU topology placement prioritizing intra-node NVLink over cross-node InfiniBand.<br>2. Implements gang-scheduling: all required GPUs across worker nodes are allocated atomically or the job remains queued.<br>3. Computes topology affinity score ($0.0 - 1.0$) for placement options.<br>4. Prevents GPU fragmentation across heterogeneous cluster hardware. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/topology-placer.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 3 — Hybrid Cloud Spot Instance Arbitrage & Workload Migration

#### NEURO-005 — Multi-Cloud Spot Price Aggregator & Arbitrage Matrix Engine
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-005 |
| **Phase** | Phase 3 — Hybrid Cloud Spot Instance Arbitrage & Workload Migration |
| **Description** | Implement `src/lib/operations/neuro/cloud/spot-price-aggregator.ts` and `src/lib/operations/neuro/cloud/cloud-arbitrage-engine.ts`. Connects to simulated/live pricing feeds across AWS (EC2 G5/P4/P5 spot), GCP (A2/A3/G2 preemptible), and RunPod (Community/Secure Cloud). Compares on-premise amortized operational cost vs. cloud spot rates to select the most cost-effective compute target. |
| **Files** | `src/lib/operations/neuro/cloud/spot-price-aggregator.ts` [NEW] · `src/lib/operations/neuro/cloud/cloud-arbitrage-engine.ts` [NEW] · `src/lib/operations/neuro/cloud/cloud-types.ts` [NEW] · `src/lib/__tests__/operations/neuro/spot-price-aggregator.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002 |
| **Acceptance Criteria** | 1. Normalizes spot pricing across AWS, GCP, and RunPod into standard hourly rates per GPU model.<br>2. Calculates real-time arbitrage recommendations achieving $\ge 30\%$ cost savings over on-demand rates.<br>3. Records historical spot price volatility indices to evaluate interruption risk.<br>4. Recommends on-premise execution when local cost or data transfer egress exceeds cloud spot arbitrage delta. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/spot-price-aggregator.test.ts`. |
| **Estimated Complexity** | High |

#### NEURO-006 — Transparent Checkpoint, Migration & Preemption Resilience Handler
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-006 |
| **Phase** | Phase 3 — Hybrid Cloud Spot Instance Arbitrage & Workload Migration |
| **Description** | Implement `src/lib/operations/neuro/cloud/checkpoint-manager.ts` and `src/lib/operations/neuro/cloud/preemption-resilience-handler.ts`. Handles automated periodic model weight checkpointing (S3/GCS/POSIX shared storage) and intercepts 2-minute cloud spot instance termination notices to cleanly pause job execution, sync state, and autonomously re-schedule the workload on an alternative node. |
| **Files** | `src/lib/operations/neuro/cloud/checkpoint-manager.ts` [NEW] · `src/lib/operations/neuro/cloud/preemption-resilience-handler.ts` [NEW] · `src/lib/__tests__/operations/neuro/checkpoint-manager.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-003, NEURO-005 |
| **Acceptance Criteria** | 1. Tracks job checkpoint snapshots with cryptographic SHA-256 weight hashes and step numbers.<br>2. Handles preemption termination events by initiating emergency checkpoint flush within 90 seconds.<br>3. Autonomously re-queues preempted jobs with highest priority boost for seamless resumption.<br>4. Achieves $\ge 95\%$ successful zero-loss job recovery on simulated spot interruptions. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/checkpoint-manager.test.ts`. |
| **Estimated Complexity** | High |

#### NEURO-007 — Carbon-Aware Compute Scheduler & ECO-MESH NetZeroOS Integration
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-007 |
| **Phase** | Phase 3 — Hybrid Cloud Spot Instance Arbitrage & Workload Migration |
| **Description** | Implement `src/lib/operations/neuro/synergy/carbon-aware-scheduler.ts` and `src/lib/operations/neuro/synergy/eco-compute-optimizer.ts`. Connects NEURO-CLUSTER with ECO-MESH (Sprint-049) to read campus solar microgrid generation and grid carbon intensity ($g\text{CO}_2/\text{kWh}$). Shifts non-urgent batch training jobs to peak renewable generation hours, minimizing institutional carbon emissions. |
| **Files** | `src/lib/operations/neuro/synergy/carbon-aware-scheduler.ts` [NEW] · `src/lib/operations/neuro/synergy/eco-compute-optimizer.ts` [NEW] · `src/lib/__tests__/operations/neuro/carbon-aware-scheduler.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-003, NEURO-005 |
| **Acceptance Criteria** | 1. Evaluates real-time campus microgrid renewable surplus from ECO-MESH.<br>2. Dynamically schedules flexible batch training jobs when solar power exceeds baseline campus demand.<br>3. Computes estimated carbon offset (kg $\text{CO}_2\text{e}$ saved) per compute job.<br>4. Supports researcher opt-in for "Green Compute" carbon-neutral certification badge. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/carbon-aware-scheduler.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 4 — Cryptographic Dataset Lineage & Scientific Provenance Engine

#### NEURO-008 — Cryptographic Dataset Provenance & Merkle DAG Lineage Engine
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-008 |
| **Phase** | Phase 4 — Cryptographic Dataset Lineage & Scientific Provenance Engine |
| **Description** | Implement `src/lib/operations/neuro/provenance/dataset-provenance-engine.ts` and `src/lib/operations/neuro/provenance/merkle-lineage-dag.ts`. Constructs a Directed Acyclic Graph (DAG) of cryptographic Merkle nodes linking raw dataset shards, preprocessing pipelines, training scripts, random seeds, hyperparameters, model weights, and compute logs into a tamper-evident audit tree. |
| **Files** | `src/lib/operations/neuro/provenance/dataset-provenance-engine.ts` [NEW] · `src/lib/operations/neuro/provenance/merkle-lineage-dag.ts` [NEW] · `src/lib/operations/neuro/provenance/provenance-types.ts` [NEW] · `src/lib/__tests__/operations/neuro/dataset-provenance-engine.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002 |
| **Acceptance Criteria** | 1. Generates SHA-256 Merkle hashes for dataset manifests and training run execution parameters.<br>2. Builds parent-child DAG relationships tracking model fine-tuning and dataset version lineage.<br>3. Computes cryptographic inclusion proofs allowing third-party verification of training integrity.<br>4. Detects dataset tampering or parameter discrepancies with immediate hash mismatch errors. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/dataset-provenance-engine.test.ts`. |
| **Estimated Complexity** | High |

#### NEURO-009 — NSF/NIH Scientific Reproducibility Exporter & Grant Audit Verifier
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-009 |
| **Phase** | Phase 4 — Cryptographic Dataset Lineage & Scientific Provenance Engine |
| **Description** | Implement `src/lib/operations/neuro/provenance/reproducibility-exporter.ts` and `src/lib/operations/neuro/provenance/grant-audit-verifier.ts`. Generates standardized scientific reproducibility manifest packages (JSON-LD / W3C PROV-O standard) and exports verifiable PDF/JSON compliance dossiers required for National Science Foundation (NSF) and National Institutes of Health (NIH) grant audit certifications. |
| **Files** | `src/lib/operations/neuro/provenance/reproducibility-exporter.ts` [NEW] · `src/lib/operations/neuro/provenance/grant-audit-verifier.ts` [NEW] · `src/lib/__tests__/operations/neuro/reproducibility-exporter.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-008 |
| **Acceptance Criteria** | 1. Exports standardized W3C PROV-O JSON-LD provenance manifests containing all training metadata.<br>2. Verifies cryptographic inclusion proofs against the global platform compliance Merkle tree (`pnpm compliance:verify`).<br>3. Generates complete Grant Audit Verification reports linked to institutional grant IDs.<br>4. Validates environment container hashes (Docker/Singularity SHA-256 digests). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/reproducibility-exporter.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 5 — Tokenized Compute Billing & Grant Allocation Ledger

#### NEURO-010 — Tokenized Departmental Compute Billing & Metering Engine
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-010 |
| **Phase** | Phase 5 — Tokenized Compute Billing & Grant Allocation Ledger |
| **Description** | Implement `src/lib/operations/neuro/billing/compute-billing-engine.ts` and `src/lib/operations/neuro/billing/compute-metering-tracker.ts`. Tracks fine-grained resource consumption (GPU core seconds, VRAM allocation GB-hours, CPU threads, NVMe storage IOPS, and network egress) and converts them into standardized institutional Compute Tokens based on dynamic rate cards. |
| **Files** | `src/lib/operations/neuro/billing/compute-billing-engine.ts` [NEW] · `src/lib/operations/neuro/billing/compute-metering-tracker.ts` [NEW] · `src/lib/operations/neuro/billing/billing-types.ts` [NEW] · `src/lib/__tests__/operations/neuro/compute-billing-engine.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-003 |
| **Acceptance Criteria** | 1. Meters multi-dimensional compute usage per job with sub-second accuracy.<br>2. Calculates tokenized cost using differentiated tier rates (e.g. H100 = 8 tokens/hr, A100 = 4 tokens/hr, L40S = 2 tokens/hr).<br>3. Incorporates spot instance discount multipliers into net token debits.<br>4. Emits real-time cost accumulation updates to active researcher sessions. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/compute-billing-engine.test.ts`. |
| **Estimated Complexity** | High |

#### NEURO-011 — Grant Credit Allocation & Double-Entry Ledger Transactions
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-011 |
| **Phase** | Phase 5 — Tokenized Compute Billing & Grant Allocation Ledger |
| **Description** | Implement `src/lib/operations/neuro/billing/grant-allocation-manager.ts` and `src/lib/operations/neuro/billing/double-entry-ledger.ts`. Manages grant budget allocations, enforces soft/hard spend caps (warning at $80\%$, queue hold at $100\%$), and posts immutable double-entry journal transactions (`DEBIT: Grant Compute Expense`, `CREDIT: Research Cluster Operations Revenue`) integrated with the platform finance ledger. |
| **Files** | `src/lib/operations/neuro/billing/grant-allocation-manager.ts` [NEW] · `src/lib/operations/neuro/billing/double-entry-ledger.ts` [NEW] · `src/lib/__tests__/operations/neuro/grant-allocation-manager.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-010 |
| **Acceptance Criteria** | 1. Allocates compute credits to specific grant numbers with expiration dates and departmental restrictions.<br>2. Enforces hard spend ceilings: automatically suspends new job submissions when grant budget is exhausted.<br>3. Maintains balanced double-entry accounting transactions for all compute charges.<br>4. Supports multi-grant split billing for collaborative cross-departmental research projects. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/grant-allocation-manager.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 6 — Real-Time Telemetry Streaming & Prometheus OpenMetrics

#### NEURO-012 — Real-Time Cluster Telemetry & Log Stream Manager
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-012 |
| **Phase** | Phase 6 — Real-Time Telemetry Streaming & Prometheus OpenMetrics |
| **Description** | Implement `src/lib/operations/neuro/streaming/neuro-stream-manager.ts`. Manages real-time Server-Sent Events (SSE) and WebSocket channels streaming live GPU telemetry (utilization %, VRAM usage, temperature °C, power watts), job queue position updates, stdout/stderr container logs, and spot price volatility alerts to admin and researcher portals. |
| **Files** | `src/lib/operations/neuro/streaming/neuro-stream-manager.ts` [NEW] · `src/lib/__tests__/operations/neuro/neuro-stream-manager.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-003 |
| **Acceptance Criteria** | 1. Delivers live GPU telemetry and job stdout/stderr streams with $< 50$ms broadcast latency.<br>2. Manages connection heartbeats, client auto-reconnection, and tenant isolation by `institutionId`.<br>3. Buffers recent stdout/stderr lines for newly connected client tabs.<br>4. Supports granular pub/sub topic subscription (e.g. `cluster:nodes`, `job:log:<jobId>`, `billing:grant:<grantId>`). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/neuro-stream-manager.test.ts`. |
| **Estimated Complexity** | Medium |

#### NEURO-013 — Prometheus OpenMetrics Research Compute Exporter
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-013 |
| **Phase** | Phase 6 — Real-Time Telemetry Streaming & Prometheus OpenMetrics |
| **Description** | Implement `src/lib/operations/neuro/telemetry/neuro-metrics.ts`. Exports 10 standardized Prometheus OpenMetrics series: `neuro_gpu_utilization_percent`, `neuro_vram_allocated_bytes`, `neuro_jobs_queued_total`, `neuro_jobs_running_total`, `neuro_job_duration_seconds`, `neuro_cloud_cost_hourly_usd`, `neuro_spot_arbitrage_savings_total`, `neuro_spot_preemptions_total`, `neuro_grant_tokens_consumed_total`, and `neuro_carbon_saved_kg`. |
| **Files** | `src/lib/operations/neuro/telemetry/neuro-metrics.ts` [NEW] · `src/lib/__tests__/operations/neuro/neuro-metrics.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002 |
| **Acceptance Criteria** | 1. Exposes all 10 metric series formatted according to Prometheus OpenMetrics 1.0 standard.<br>2. Automatically tags metrics with `institution_id`, `cluster_id`, `department_id`, `gpu_model`, and `provider` labels.<br>3. Accurately tracks cumulative spot arbitrage savings and carbon offset gauges.<br>4. Unit tests verify metric incrementing, gauge setting, and scrape output formatting. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/neuro-metrics.test.ts`. |
| **Estimated Complexity** | Low |

#### NEURO-014 — Cryptographic Merkle Audit Anchor for Research Operations
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-014 |
| **Phase** | Phase 6 — Real-Time Telemetry Streaming & Prometheus OpenMetrics |
| **Description** | Implement `src/lib/operations/neuro/security/neuro-merkle-anchor.ts` and `src/lib/operations/neuro/security/compute-audit-verifier.ts`. Implements a cryptographic SHA-256 Merkle tree that anchors all critical cluster actions: job submissions, quota modifications, spot arbitrage migrations, grant debit transactions, and dataset lineage seals (`pnpm compliance:verify`). |
| **Files** | `src/lib/operations/neuro/security/neuro-merkle-anchor.ts` [NEW] · `src/lib/operations/neuro/security/compute-audit-verifier.ts` [NEW] · `src/lib/__tests__/operations/neuro/neuro-merkle-anchor.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-008 |
| **Acceptance Criteria** | 1. Anchors all cluster state modifications and grant debits into an unbroken SHA-256 hash chain.<br>2. Generates verifiable Merkle inclusion proofs for any job execution or grant debit record.<br>3. Detects any tampering or unauthorized record modification during integrity scans.<br>4. Integrates with the platform-wide compliance verification runner (`pnpm compliance:verify`). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/neuro/neuro-merkle-anchor.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 7 — Secure RBAC API Gateway Suite

#### NEURO-015 — REST API Handlers for Cluster Management & Compute Nodes
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-015 |
| **Phase** | Phase 7 — Secure RBAC API Gateway Suite |
| **Description** | Implement Next.js App Router API route handlers for cluster registration, node lifecycle, and GPU inventory management at `src/app/api/neuro/clusters/route.ts`, `src/app/api/neuro/nodes/route.ts`, and `src/app/api/neuro/gpus/route.ts`. All endpoints wrapped in `requireAuth` with Zod input validation schemas. |
| **Files** | `src/app/api/neuro/clusters/route.ts` [NEW] · `src/app/api/neuro/nodes/route.ts` [NEW] · `src/app/api/neuro/gpus/route.ts` [NEW] · `src/lib/validation/neuro-schemas.ts` [NEW] · `src/lib/__tests__/api/neuro-cluster-routes.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-003, NEURO-004 |
| **Acceptance Criteria** | 1. Complete CRUD endpoints for clusters, nodes, and GPUs with strict RBAC permission enforcement.<br>2. Node drain/cordon and GPU maintenance state updates executed atomically.<br>3. Strict Zod schema validation on all request bodies with clean JSON error formatting.<br>4. Gateway AST route scanner confirms 100% route shielding. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/neuro-cluster-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

#### NEURO-016 — REST API Handlers for Job Submission, Lifecycle & Real-Time Logs
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-016 |
| **Phase** | Phase 7 — Secure RBAC API Gateway Suite |
| **Description** | Implement API route handlers at `src/app/api/neuro/jobs/route.ts`, `src/app/api/neuro/jobs/[id]/route.ts`, `src/app/api/neuro/jobs/[id]/cancel/route.ts`, and `src/app/api/neuro/jobs/[id]/logs/route.ts`. Handles batch/distributed job submissions, interactive notebook session requests, job pause/cancel actions, and log streaming. |
| **Files** | `src/app/api/neuro/jobs/route.ts` [NEW] · `src/app/api/neuro/jobs/[id]/route.ts` [NEW] · `src/app/api/neuro/jobs/[id]/cancel/route.ts` [NEW] · `src/app/api/neuro/jobs/[id]/logs/route.ts` [NEW] · `src/lib/__tests__/api/neuro-job-routes.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-003, NEURO-012, NEURO-015 |
| **Acceptance Criteria** | 1. Job submission endpoint validates resource requests (GPUs, VRAM, walltime) and grant budget eligibility.<br>2. Enforces atomic state transitions: `pending` $\to$ `queued` $\to$ `running` $\to$ `checkpointing` $\to$ `completed` / `failed` / `cancelled`.<br>3. Log endpoint provides real-time chunked log retrieval and WebSocket/SSE streaming.<br>4. Implements DPoP token verification for job cancellations and manual priority overrides. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/neuro-job-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

#### NEURO-017 — REST API Handlers for Spot Arbitrage, Dataset Lineage, Billing & SSE Stream
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-017 |
| **Phase** | Phase 7 — Secure RBAC API Gateway Suite |
| **Description** | Implement API route handlers at `src/app/api/neuro/cloud/spot/route.ts`, `src/app/api/neuro/provenance/route.ts`, `src/app/api/neuro/billing/route.ts`, and `src/app/api/neuro/stream/route.ts`. Handles cloud spot provider configuration, dataset lineage queries, grant credit allocations, billing reports, and authenticated SSE telemetry streaming. |
| **Files** | `src/app/api/neuro/cloud/spot/route.ts` [NEW] · `src/app/api/neuro/provenance/route.ts` [NEW] · `src/app/api/neuro/billing/route.ts` [NEW] · `src/app/api/neuro/stream/route.ts` [NEW] · `src/lib/__tests__/api/neuro-billing-stream-routes.test.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-005, NEURO-008, NEURO-010, NEURO-012 |
| **Acceptance Criteria** | 1. Spot endpoint returns real-time arbitrage matrices and savings analytics.<br>2. Provenance endpoint provides Merkle DAG lineage verification and W3C PROV-O manifest downloads.<br>3. Billing endpoint returns grant account balances, token consumption rates, and ledger statements.<br>4. Stream endpoint establishes authenticated SSE channel delivering live telemetry and queue events. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/neuro-billing-stream-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

---

### Phase 8 — Admin Research Cluster Cockpit & Researcher Launchpad UI

#### NEURO-018 — Admin Research Cluster Cockpit (`/admin/operations/neuro-cluster`)
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-018 |
| **Phase** | Phase 8 — Admin Research Cluster Cockpit & Researcher Launchpad UI |
| **Description** | Build the 5-tab administrative command center at `src/app/(shell)/admin/operations/neuro-cluster/page.tsx` and supporting components in `src/components/operations/neuro/admin/`. Tabs: (1) Cluster & Node Topology Studio, (2) Job Queue & Scheduler Radar, (3) Hybrid Cloud & Spot Arbitrage Matrix, (4) Dataset Lineage & Compliance Vault, and (5) Grant Billing & Quota Ledger. Built strictly with standard design primitives (`Card`, `Badge`, `Skeleton`, `Dialog`, `Alert`, `Tabs`). |
| **Files** | `src/app/(shell)/admin/operations/neuro-cluster/page.tsx` [NEW] · `src/components/operations/neuro/admin/cluster-topology-tab.tsx` [NEW] · `src/components/operations/neuro/admin/job-queue-radar-tab.tsx` [NEW] · `src/components/operations/neuro/admin/spot-arbitrage-tab.tsx` [NEW] · `src/components/operations/neuro/admin/dataset-lineage-tab.tsx` [NEW] · `src/components/operations/neuro/admin/grant-billing-tab.tsx` [NEW] |
| **Dependencies** | NEURO-001, NEURO-015, NEURO-016, NEURO-017 |
| **Acceptance Criteria** | 1. 5-tab dashboard renders smoothly with sub-3-second load times and zero stuck loading spinners.<br>2. Displays cluster node health cards with live GPU utilization sparklines and NVLink topology matrices.<br>3. Renders interactive job queue Gantt timeline with fair-share quota breakdown.<br>4. Interactive cloud spot arbitrage table with one-click provider enable/disable toggles.<br>5. Conforms to UI rules: no raw HTML inputs/buttons, proper `<Badge>` variants, `<Skeleton>` loaders. |
| **Verification Method** | Run Next.js build (`pnpm build`) and verify rendering via component unit tests. |
| **Estimated Complexity** | High |

#### NEURO-019 — Researcher Launchpad Portal (`/portal/research-compute`)
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-019 |
| **Phase** | Phase 8 — Admin Research Cluster Cockpit & Researcher Launchpad UI |
| **Description** | Build the self-service researcher portal at `src/app/(shell)/portal/research-compute/page.tsx` and components in `src/components/operations/neuro/researcher/`. Features: (1) Interactive JupyterLab / VS Code server session launcher, (2) Multi-GPU distributed training job submission wizard, (3) Real-time container log terminal with search and autoscroll, and (4) Personal grant budget spend tracker. |
| **Files** | `src/app/(shell)/portal/research-compute/page.tsx` [NEW] · `src/components/operations/neuro/researcher/notebook-launcher-card.tsx` [NEW] · `src/components/operations/neuro/researcher/job-submission-modal.tsx` [NEW] · `src/components/operations/neuro/researcher/job-log-viewer.tsx` [NEW] · `src/components/operations/neuro/researcher/grant-budget-card.tsx` [NEW] |
| **Dependencies** | NEURO-001, NEURO-015, NEURO-016, NEURO-017 |
| **Acceptance Criteria** | 1. Researcher can launch interactive Jupyter session with 1 click, selecting GPU model and VRAM.<br>2. Job submission wizard guides container image, command, dataset mounts, and hyperparameter input.<br>3. Real-time log viewer renders container stdout/stderr with syntax highlighting and auto-scroll.<br>4. Displays available grant tokens, burn rate estimate, and remaining project runway. |
| **Verification Method** | Run Next.js build (`pnpm build`) and verify component unit tests. |
| **Estimated Complexity** | High |

#### NEURO-020 — Real-Time GPU Utilization & Topology Visualizer
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-020 |
| **Phase** | Phase 8 — Admin Research Cluster Cockpit & Researcher Launchpad UI |
| **Description** | Implement `src/components/operations/neuro/diagnostics/gpu-heatmap-grid.tsx` and `src/components/operations/neuro/diagnostics/nvlink-topology-canvas.tsx`. Visualizes real-time cluster-wide GPU utilization heatmaps (SM activity, VRAM allocated vs. free, temperature °C, power watts) and renders interactive NVLink/PCIe interconnect bandwidth graphs. |
| **Files** | `src/components/operations/neuro/diagnostics/gpu-heatmap-grid.tsx` [NEW] · `src/components/operations/neuro/diagnostics/nvlink-topology-canvas.tsx` [NEW] · `src/components/operations/neuro/diagnostics/cluster-health-summary.tsx` [NEW] |
| **Dependencies** | NEURO-004, NEURO-012, NEURO-015 |
| **Acceptance Criteria** | 1. GPU heatmap grid visualizes all cluster GPUs with color-coded utilization and thermal status.<br>2. Topology canvas renders interconnect mesh between GPUs with active transfer bandwidth indicators.<br>3. Updates smoothly in real time via SSE stream without UI freezing or frame drops.<br>4. Fully responsive across desktop, tablet, and mobile viewports. |
| **Verification Method** | Run component test suite and verify visualizer rendering. |
| **Estimated Complexity** | High |

#### NEURO-021 — TWIN-OPS 3D Datacenter Digital Twin Overlay Integration
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-021 |
| **Phase** | Phase 8 — Admin Research Cluster Cockpit & Researcher Launchpad UI |
| **Description** | Implement `src/components/operations/neuro/twin/twin-datacenter-overlay.tsx` and `src/components/operations/neuro/twin/server-rack-3d-marker.tsx`. Integrates with the TWIN-OPS 3D campus viewer to render server racks, compute chassis power load badges, rack-level thermal airflow contours, and cold/hot aisle containment status in the 3D digital twin canvas. |
| **Files** | `src/components/operations/neuro/twin/twin-datacenter-overlay.tsx` [NEW] · `src/components/operations/neuro/twin/server-rack-3d-marker.tsx` [NEW] · `src/components/operations/neuro/twin/neuro-twin-types.ts` [NEW] |
| **Dependencies** | NEURO-001, NEURO-002, NEURO-018 |
| **Acceptance Criteria** | 1. Renders 3D datacenter server racks positioned at exact building/floor/room coordinates.<br>2. Clicking a server rack opens real-time diagnostic popover with node list, GPU load, and thermal status.<br>3. Visualizes dynamic hot-aisle/cold-aisle temperature heatmaps.<br>4. Maintains $> 45$ FPS rendering performance in 3D digital twin scene. |
| **Verification Method** | Run component test suite and verify 3D overlay event hooks. |
| **Estimated Complexity** | High |

---

### Phase 9 — Mobile Integration (Flutter)

#### NEURO-022 — Flutter Mobile Research Companion & Admin Cluster Monitor
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-022 |
| **Phase** | Phase 9 — Mobile Integration (Flutter) |
| **Description** | Implement the mobile research compute suite in Flutter (`mobile/lib/features/research_compute/`) using Riverpod state management: `ClusterOverviewScreen` (cluster health, GPU utilization, active queue), `ResearcherJobScreen` (job status, training epoch progress, live loss curves), `SpotArbitrageAlertScreen` (price volatility notifications, spot interruption warnings), and `JobDetailControlScreen` (pause, cancel, and checkpoint trigger actions). |
| **Files** | `mobile/lib/features/research_compute/application/neuro_providers.dart` [NEW] · `mobile/lib/features/research_compute/data/neuro_api_service.dart` [NEW] · `mobile/lib/features/research_compute/presentation/cluster_overview_screen.dart` [NEW] · `mobile/lib/features/research_compute/presentation/researcher_job_screen.dart` [NEW] · `mobile/lib/features/research_compute/presentation/spot_arbitrage_alert_screen.dart` [NEW] · `mobile/lib/features/research_compute/presentation/job_detail_control_screen.dart` [NEW] · `mobile/lib/app/router.dart` [MODIFY] |
| **Dependencies** | NEURO-015, NEURO-016, NEURO-017 |
| **Acceptance Criteria** | 1. Riverpod providers manage real-time cluster state, active job status, and spot price feeds.<br>2. Job screen visualizes training progress, GPU allocation, and loss metrics.<br>3. Allows authorized users to pause or cancel running jobs remotely with confirmation dialog.<br>4. Routes registered under `lib/app/router.dart` with `_authGuard` protection; passes `flutter analyze`. |
| **Verification Method** | Run `flutter analyze` in `mobile/` directory. |
| **Estimated Complexity** | High |

---

### Phase 10 — End-to-End Simulation CLI Harness & Governance

#### NEURO-023 — End-to-End Research Computing Simulation CLI Harness (`pnpm neuro:simulate`)
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-023 |
| **Phase** | Phase 10 — End-to-End Simulation CLI Harness & Governance |
| **Description** | Implement `scripts/operations/neuro-simulation-runner.ts` and add package script `pnpm neuro:simulate`. Executes 8 comprehensive automated simulation stages: (1) Cluster & Heterogeneous Node Registration, (2) Multi-Tenant Fair-Share Job Scheduling & Priority Queuing, (3) Topology-Aware Gang-Scheduling & NVLink Placement, (4) Hybrid Cloud Spot Arbitrage & Cost Optimization, (5) Cloud Spot Preemption & Checkpoint/Resume Migration, (6) Cryptographic Dataset Lineage & Merkle Proof Generation, (7) Grant Budget Spend Ceiling Enforcement & Double-Entry Ledger Posting, and (8) NSF/NIH Scientific Compliance & Audit Trail Verification. |
| **Files** | `scripts/operations/neuro-simulation-runner.ts` [NEW] · `package.json` [MODIFY] · `src/lib/__tests__/simulation/neuro-simulate.test.ts` [NEW] |
| **Dependencies** | NEURO-001 through NEURO-021 |
| **Acceptance Criteria** | 1. Simulation runner executes all 8 stages sequentially with colored terminal logging and exit code 0.<br>2. Verifies scheduling queues, spot arbitrage savings, zero-loss checkpoint recovery, Merkle inclusion proofs, and grant debit ledger accounting.<br>3. Supports standalone flags: `--stage=scheduler`, `--stage=spot`, `--stage=provenance`, `--stage=billing`.<br>4. Clean test execution incorporated into CI/CD regression verification. |
| **Verification Method** | Run `pnpm neuro:simulate` and `pnpm test src/lib/__tests__/simulation/neuro-simulate.test.ts`. |
| **Estimated Complexity** | High |

#### NEURO-024 — Research Computing Architecture Guides & Standard Runbooks
| Field | Specification Details |
|---|---|
| **Task ID** | NEURO-024 |
| **Phase** | Phase 10 — End-to-End Simulation CLI Harness & Governance |
| **Description** | Author 5 comprehensive operational runbooks and engineering reference guides in `docs/operations/`: (1) `neuro-cluster-architecture-guide.md` (cluster architecture & scheduling theory), (2) `hybrid-cloud-spot-arbitrage-standard.md` (AWS/GCP/RunPod spot integration & preemption handlers), (3) `dataset-provenance-merkle-runbook.md` (cryptographic lineage, W3C PROV-O & NSF/NIH compliance), (4) `grant-compute-billing-ledger-standard.md` (tokenized billing & double-entry accounting), and (5) `researcher-onboarding-hpc-guide.md` (JupyterLab launching, distributed PyTorch/vLLM job submission & best practices). |
| **Files** | `docs/operations/neuro-cluster-architecture-guide.md` [NEW] · `docs/operations/hybrid-cloud-spot-arbitrage-standard.md` [NEW] · `docs/operations/dataset-provenance-merkle-runbook.md` [NEW] · `docs/operations/grant-compute-billing-ledger-standard.md` [NEW] · `docs/operations/researcher-onboarding-hpc-guide.md` [NEW] |
| **Dependencies** | NEURO-001 through NEURO-023 |
| **Acceptance Criteria** | 1. All 5 guides authored with complete mathematical formulas, JSON configuration examples, and ASCII diagrams.<br>2. Covers cluster scaling, spot arbitrage tuning, Merkle verification, and distributed ML optimization.<br>3. Formatted with clickable links and cross-references conforming to AIOS standards. |
| **Verification Method** | Verify markdown structure and documentation link integrity. |
| **Estimated Complexity** | Low |

---

## 5. Complete Repository File Structure Impact

```
packages/db/
├── schema.ts                                      [NEURO-001]
└── schema.pg.ts                                   [NEURO-001]

src/lib/
├── db/
│   └── neuro-store.ts                             [NEURO-002]
├── operations/
│   └── neuro/
│       ├── neuro-types.ts                         [NEURO-002]
│       ├── scheduler/
│       │   ├── scheduler-types.ts                 [NEURO-003]
│       │   ├── gpu-scheduler-engine.ts            [NEURO-003]
│       │   ├── fair-share-calculator.ts           [NEURO-003]
│       │   ├── topology-placer.ts                 [NEURO-004]
│       │   └── gang-scheduler.ts                  [NEURO-004]
│       ├── cloud/
│       │   ├── cloud-types.ts                     [NEURO-005]
│       │   ├── spot-price-aggregator.ts           [NEURO-005]
│       │   ├── cloud-arbitrage-engine.ts          [NEURO-005]
│       │   ├── checkpoint-manager.ts              [NEURO-006]
│       │   └── preemption-resilience-handler.ts   [NEURO-006]
│       ├── synergy/
│       │   ├── carbon-aware-scheduler.ts          [NEURO-007]
│       │   └── eco-compute-optimizer.ts           [NEURO-007]
│       ├── provenance/
│       │   ├── provenance-types.ts                [NEURO-008]
│       │   ├── dataset-provenance-engine.ts       [NEURO-008]
│       │   ├── merkle-lineage-dag.ts              [NEURO-008]
│       │   ├── reproducibility-exporter.ts        [NEURO-009]
│       │   └── grant-audit-verifier.ts            [NEURO-009]
│       ├── billing/
│       │   ├── billing-types.ts                   [NEURO-010]
│       │   ├── compute-billing-engine.ts          [NEURO-010]
│       │   ├── compute-metering-tracker.ts        [NEURO-010]
│       │   ├── grant-allocation-manager.ts        [NEURO-011]
│       │   └── double-entry-ledger.ts             [NEURO-011]
│       ├── streaming/
│       │   └── neuro-stream-manager.ts            [NEURO-012]
│       ├── telemetry/
│       │   └── neuro-metrics.ts                   [NEURO-013]
│       └── security/
│           ├── neuro-merkle-anchor.ts             [NEURO-014]
│           └── compute-audit-verifier.ts          [NEURO-014]
└── validation/
    └── neuro-schemas.ts                           [NEURO-015]

src/app/api/neuro/
├── clusters/route.ts                              [NEURO-015]
├── nodes/route.ts                                 [NEURO-015]
├── gpus/route.ts                                  [NEURO-015]
├── jobs/
│   ├── route.ts                                   [NEURO-016]
│   └── [id]/
│       ├── route.ts                               [NEURO-016]
│       ├── cancel/route.ts                        [NEURO-016]
│       └── logs/route.ts                          [NEURO-016]
├── cloud/
│   └── spot/route.ts                              [NEURO-017]
├── provenance/route.ts                            [NEURO-017]
├── billing/route.ts                               [NEURO-017]
└── stream/route.ts                                [NEURO-017]

src/app/(shell)/
├── admin/operations/neuro-cluster/page.tsx        [NEURO-018]
└── portal/research-compute/page.tsx               [NEURO-019]

src/components/operations/neuro/
├── admin/
│   ├── cluster-topology-tab.tsx                   [NEURO-018]
│   ├── job-queue-radar-tab.tsx                    [NEURO-018]
│   ├── spot-arbitrage-tab.tsx                     [NEURO-018]
│   ├── dataset-lineage-tab.tsx                    [NEURO-018]
│   └── grant-billing-tab.tsx                      [NEURO-018]
├── researcher/
│   ├── notebook-launcher-card.tsx                 [NEURO-019]
│   ├── job-submission-modal.tsx                   [NEURO-019]
│   ├── job-log-viewer.tsx                         [NEURO-019]
│   └── grant-budget-card.tsx                      [NEURO-019]
├── diagnostics/
│   ├── gpu-heatmap-grid.tsx                       [NEURO-020]
│   ├── nvlink-topology-canvas.tsx                 [NEURO-020]
│   └── cluster-health-summary.tsx                 [NEURO-020]
└── twin/
    ├── neuro-twin-types.ts                        [NEURO-021]
    ├── twin-datacenter-overlay.tsx                [NEURO-021]
    └── server-rack-3d-marker.tsx                  [NEURO-021]

mobile/lib/features/research_compute/
├── application/neuro_providers.dart               [NEURO-022]
├── data/neuro_api_service.dart                    [NEURO-022]
└── presentation/
    ├── cluster_overview_screen.dart               [NEURO-022]
    ├── researcher_job_screen.dart                 [NEURO-022]
    ├── spot_arbitrage_alert_screen.dart           [NEURO-022]
    └── job_detail_control_screen.dart             [NEURO-022]

scripts/operations/
└── neuro-simulation-runner.ts                     [NEURO-023]

docs/operations/
├── neuro-cluster-architecture-guide.md            [NEURO-024]
├── hybrid-cloud-spot-arbitrage-standard.md        [NEURO-024]
├── dataset-provenance-merkle-runbook.md           [NEURO-024]
├── grant-compute-billing-ledger-standard.md       [NEURO-024]
└── researcher-onboarding-hpc-guide.md             [NEURO-024]
```

---

## 6. Security, RBAC & Compliance Framework

### RBAC Permissions

| Permission String | Role Access | Description |
|---|---|---|
| `neuro:cluster:view` | `super_admin`, `admin`, `principal`, `hod`, `staff` | View research clusters, compute node status, GPU telemetry, and queue overview. |
| `neuro:cluster:manage` | `super_admin`, `admin` | Register clusters, drain/cordon compute nodes, configure GPU topology, and adjust system limits. |
| `neuro:jobs:view` | `super_admin`, `admin`, `principal`, `hod`, `staff` | View training jobs, queue status, checkpoint histories, and public execution logs. |
| `neuro:jobs:submit` | `super_admin`, `admin`, `principal`, `hod`, `staff` (Researchers) | Submit batch/distributed training jobs and request interactive Jupyter notebook sessions. |
| `neuro:jobs:manage` | `super_admin`, `admin`, `staff` (Job Owner) | Cancel, pause, checkpoint, or modify priority for own research compute jobs. |
| `neuro:jobs:override` | `super_admin`, `admin` (HPC Admin) | Override queue priority, preempt jobs, and reassign departmental compute resources. |
| `neuro:spot:manage` | `super_admin`, `admin` | Configure cloud spot providers (AWS, GCP, RunPod), set price thresholds, and toggle arbitrage. |
| `neuro:provenance:view` | `super_admin`, `admin`, `principal`, `hod`, `staff` | Query dataset lineage Merkle DAGs, download inclusion proofs, and inspect model provenance. |
| `neuro:provenance:seal` | `super_admin`, `admin`, `staff` (Lead PI) | Seal training runs, generate cryptographic provenance manifests, and certify grant compliance. |
| `neuro:billing:view` | `super_admin`, `admin`, `principal`, `hod`, `staff` | View departmental compute token balances, grant allocations, and consumption reports. |
| `neuro:billing:manage` | `super_admin`, `admin`, `principal` (Dean of Research) | Allocate compute credits to grants, set soft/hard budget caps, and approve ledger adjustments. |

### Compliance & Cryptographic Controls
- **NSF & NIH Scientific Reproducibility Compliance:** All research compute jobs record exact container digests, random seeds, hyperparameters, dataset SHA-256 hashes, and checkpoint weights, generating verifiable W3C PROV-O compliance manifests.
- **SHA-256 Merkle DAG Lineage Tree:** Every dataset snapshot, training epoch checkpoint, and grant debit transaction is cryptographically linked to the global platform compliance Merkle chain (`pnpm compliance:verify`).
- **Strict Multi-Tenant Isolation:** Compute jobs, datasets, billing accounts, and telemetry streams are partitioned strictly by `institutionId` and departmental boundaries, preventing cross-tenant data or compute leakage.
- **DPoP Cryptographic Proof of Possession:** All sensitive operations (job cancellations, grant credit transfers, priority overrides) require DPoP token verification.

---

## 7. Risk Register & Mitigation Strategy

| Risk ID | Category | Risk Description | Severity | Probability | Mitigation Strategy |
|---|---|---|---|---|---|
| **R-053-1** | Cloud Spot Volatility & Interruption | Unscheduled spot instance termination mid-training causing loss of compute progress and wasted grant funds. | High | Medium | Implement automated periodic checkpointing to distributed object storage and 90-second emergency checkpoint handler on 2-minute preemption notice. |
| **R-053-2** | Cross-Cloud Network Latency & Egress Costs | Distributing multi-node distributed training across hybrid cloud boundaries introducing high network latency and exorbitant egress fees. | High | Low | Enforce strict gang-scheduling locality: single distributed training jobs are bound to a single datacenter/region; hybrid bursting is isolated to independent jobs. |
| **R-053-3** | GPU Multi-Tenant VRAM Contention | Multiple collocated workloads or notebook sessions causing GPU Out-Of-Memory (OOM) crashes and kernel thrashing. | Medium | Medium | Implement NVIDIA MPS / MIG (Multi-Instance GPU) partition profiles and strict container VRAM allocation bounds with auto-enforced limits. |
| **R-053-4** | Departmental Quota Contention & Starvation | High-volume AI research lab monopolizing cluster GPUs, starving smaller departments of interactive compute. | High | Low | Implement decayed half-life fair-share algorithm with priority boosting for starved departments and hard departmental allocation ceilings. |
| **R-053-5** | Large Research Dataset Storage Bottleneck | Terabyte-scale datasets overwhelming storage I/O and slowing GPU compute utilization below 50%. | Medium | Medium | Implement local node NVMe scratch caching, tiered dataset prefetching, and memory-mapped dataset streaming. |
| **R-053-6** | Grant Budget Overrun Risk | Unmonitored distributed training jobs burning through grant compute credits overnight. | High | Low | Implement automated soft cap email/push alerts at 80% and strict hard cap job termination / queue holds at 100% grant budget utilization. |

---

## 8. Rollback Plan

### Rollback Trigger Criteria
- Cluster scheduler enters deadlock or scheduling loop consuming $> 90\%$ CPU without dispatching queued jobs.
- Cloud spot arbitrage engine initiates unapproved or runaway cloud instance provisioning exceeding cost budgets.
- Checkpoint manager corrupts model weight snapshots during preemption migrations.
- Grant billing engine posts incorrect or unbalanced ledger debit transactions.

### Rollback Execution Steps

```bash
# Step 1: Disable NEURO-CLUSTER Subsystem via Environment Feature Flags (< 30 seconds)
NEURO_CLUSTER_ENABLED=false
NEURO_SCHEDULER_AUTODISPATCH_ENABLED=false
NEURO_HYBRID_SPOT_ARBITRAGE_ENABLED=false
NEURO_GRANT_BILLING_AUTODEBIT_ENABLED=false
NEURO_TWIN_DATACENTER_ENABLED=false

# Step 2: Enable Fallback Standalone Queue Mode (< 30 seconds)
NEURO_MANUAL_SCHEDULER_FALLBACK=true

# Step 3: Revert Source Code & Migrations (if necessary) (< 5 minutes)
git revert --no-edit HEAD
pnpm build

# Step 4: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 9. Definition of Done

A Sprint-053 task is considered **COMPLETE** when all of the following quality gates are satisfied:

### Code Quality & Standards
- [ ] `pnpm typecheck` (`pnpm tsc --noEmit`) passes with 0 TypeScript errors across `src/`, `packages/auth`, and `packages/db`.
- [ ] `pnpm lint` passes with 0 errors and 0 new warnings.
- [ ] `flutter analyze` passes with 0 errors and 0 warnings in `mobile/`.
- [ ] Zero `console.log` statements in production source code (`src/`, `packages/`, `mobile/`).
- [ ] No hardcoded cloud API keys, SSH credentials, secrets, or bypassed authorization checks.
- [ ] Complete TypeScript interfaces and JSDoc documentation on all exported types, functions, and classes.

### Testing & Verification
- [ ] Unit tests authored for every new module with $\ge 90\%$ code coverage.
- [ ] Full test suite passes: `pnpm test` $\to$ 100% pass rate across all test suites (including 20+ new NEURO-CLUSTER test suites).
- [ ] `pnpm gateway:scan --strict --json` $\to$ 100% route coverage verified with 0 unshielded endpoints.
- [ ] `pnpm compliance:scan` $\to$ 100% compliance audit coverage across all mutation routes.
- [ ] `pnpm compliance:verify` $\to$ Cryptographic Merkle audit chain verified intact.
- [ ] `pnpm security:tenants` $\to$ 0 cross-tenant isolation leaks across all files.
- [ ] `neuro-schema-parity.test.ts` $\to$ 100% schema parity confirmed between SQLite and PostgreSQL.
- [ ] `pnpm neuro:simulate` $\to$ All 8 simulation scenarios pass with 100% success.
- [ ] Scheduler handles $> 1,000$ queued jobs with $< 15$ms evaluation latency.

### Security & RBAC
- [ ] All new NEURO-CLUSTER API routes protected with `requireAuth` and granular permissions.
- [ ] DPoP cryptographic proof of possession validated on all job cancellation, grant transfer, and priority override endpoints.
- [ ] Strict row-level institution isolation verified across all queries.
- [ ] Sensitive cloud provider credentials and grant budgets strictly restricted to authorized personnel.

### Documentation & Governance
- [ ] 5 operational runbooks created in `docs/operations/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-053 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.37.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with Sprint-053 deliverables.
- [ ] `.ai/execution/Sprint-053-Execution-Log.md` initialized with all 24 tasks.

---

## 10. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-053 |
| **Sprint Name** | Autonomous Research Computing & High-Performance AI Cluster Orchestrator (NEURO-CLUSTER / ResearchCompute OS) |
| **Target Release Version** | v3.37.0 |
| **Total Implementation Tasks** | 24 (NEURO-001 through NEURO-024) |
| **Estimated Sprint Duration** | 16–18 engineering days |
| **Estimated Complexity** | Large |
| **Predecessor Sprint** | SPRINT-052 (v3.36.0 — AI-Powered Smart Campus Operations & Autonomous Facilities Maintenance — FACILITY-MIND / SmartCampus OS) |
| **Successor Artifact** | `.ai/execution/Sprint-053-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-053.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-21*  
*ThaibaHive Institution OS — Sprint-053 v3.37.0 Engineering Lifecycle*
