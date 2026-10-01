# Changelog

All notable changes to the **ThaibaHive** enterprise autonomous platform will be documented in this file.

## [3.33.0] - 2026-10-01
### Sprint-100: Autonomous Multi-Agent Workflow Orchestration (AIGENT-OS)
#### Added
- **Multi-Agent Orchestration Layer**: 5 specialized autonomous domain agents (Academic, Finance, Security, Facilities, HR) with 17 sandboxed tools and compensating actions.
- **Declarative Workflow DSL & DAG Engine**: Cyclic dependency detection, multi-strategy concurrency policies (`skip`, `queue`, `allow`), exponential backoff retries, and reverse-order saga rollbacks.
- **Cryptographic Merkle Audit Ledger**: Buffered batch ingestion (`enqueueInvocation`, `flushPendingInvocations`), load gate backpressure monitoring, and SHA-256 hash pointer verification.
- **Emergency Kill-Switch & Step-Up Security (D12)**: Step-up authentication freshness validation ($\le 5\text{ min}$), explicit confirmation phrase typing (`CONFIRM HALT ALL AGENTS`), and role-based boundaries.
- **Human-in-the-Loop (HITL) & D14 Conflict Resolution**: Dynamic approval gates with expiry policies (`escalate`, `hold`, `reject`), and `409 Conflict` resolution on stale/duplicate gate decisions.
- **Dual-Dialect Database Parity**: 7 new tables across SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`) with 100% dialect mapping parity.
- **Observability, Cockpit UI & Mobile**: OpenMetrics Prometheus exporter (`/api/agents/metrics`), management cockpit pages at `/admin/agents`, Flutter Riverpod mobile agent hub, and 8-stage simulation CLI `pnpm agent:simulate`.
- **Operational Runbooks**: Authored Agent Lifecycle Runbook (`docs/operations/agent-operations-runbook.md`), Workflow Governance Runbook (`docs/operations/workflow-governance-runbook.md`), and Emergency Incident Runbook (`docs/operations/killswitch-incident-runbook.md`).

## [3.32.0] - 2026-10-01
### Modernization, Modular Architecture & Performance Engineering
#### Added
- **Modular Component Architecture (Wave 2)**: Decomposed 4 oversized monolith pages (`media-library`, `vehicles`, `circulars`, `grievances`) into 14 specialized, reusable domain subcomponents.
- **Zustand State Centralization (Wave 3)**: Unified scattered `useState` hooks across 6 core platform modules into centralized type-safe stores (`useMediaStore`, `useVehicleStore`, `useCircularStore`, `useGrievanceStore`, `useAccountsStore`, `usePurchasesStore`) with persistence and selectors.
- **WCAG 2.1 AA Accessibility Polish (Wave 4)**: Remediated authentication (`/signup`, `/auth/login`), staff directory (`/staff`), attendance (`/attendance`), and tasks Kanban (`/tasks`) with explicit label bindings, ARIA landmarks, `aria-live` dynamic announcements, keyboard focus-visible rings, and screen-reader accessible headers.
- **Performance & Dynamic Code-Splitting (Wave 5)**: Implemented `next/dynamic` lazy loading for all heavy interactive dialogs and modals, tuned `optimizePackageImports` in `next.config.ts`, and configured TanStack Query cache defaults (`staleTime: 60s`, `gcTime: 5m`, `refetchOnWindowFocus: false`).
- **Comprehensive Documentation Suite (Wave 6)**: Authored Developer & Architecture Onboarding Guide (`docs/developer-onboarding-guide.md`), Design System & Component Catalog (`docs/design-system-and-components.md`), and OpenAPI 3.1 Specification Reference (`docs/api-reference-and-openapi-guide.md`).

## [3.31.0] - 2026-09-27
### Sprint-051: 5-Tier RBAC & Tenant Boundary Deep Enforcement
#### Added
- **5-Tier Role Hierarchy**: Fully mapped 276 granular permissions across all 5 tiers (`super_admin`, `admin`, `principal`, `hod`, `staff`) plus specialized roles (`accounts`, `purchase`, `regional_admin`, `regional_auditor`) with negative boundary enforcement.
- **Continuous AST RBAC Scanner**: Integrated `pnpm security:rbac` into CI/CD for automated zero-drift permission mapping.
- **26-Test RBAC Test Suite**: Positive grants, negative boundaries, and role injection prevention.

## [3.30.0] - 2026-08-21
### Sprint-050: SafeCampus OS & Vision Shield Verification
#### Added
- **Vision Shield Telemetry**: Edge ALPR vehicle recognition, privacy guardrails, lockdown emergency modal, and real-time SSE stream with `requireAuth` protection.
- **Dual-Store Index Parity**: SQLite and PostgreSQL schema synchronization for vision logs and eco offsets.
### Sprint-043: Autonomous Intelligence & Multi-Agent Smart Campus System (AIMS / AutoOps)
#### Added
- **Multi-Agent Reinforcement Learning (MARL)**: Decentralized actor policies evaluated with Centralized Critic $Q(s, a_1, \dots, a_n)$, VCG auction conflict resolution, and sub-100ms emergency kill-switch guardrails.
- **Smart HVAC & Microgrid Optimization**: ISO 7730 Fanger PMV/PPD thermal comfort engine with 1D Kalman sensor noise filtering, ASHRAE 62.1 fresh air ventilation CFM, and solar PV/battery BESS grid tariff arbitrage.
- **Autonomous Fleet Logistics & Safety**: Capacitated Vehicle Routing with Time Windows (CVRPTW), predictive vehicle component wear analytics, speed/duty safety enforcers, and weather-aware transit buffers.
- **Edge Biometrics & Zero-Knowledge Proofs**: Sub-50ms cosine similarity matching, zk-SNARK Groth16 / BN254 attestation circuits, and offline HMAC-signed outbox synchronization.
- **Multi-Cloud Rightsizing & ESG Sustainability**: Non-prod instance downsizing, 2-minute pre-drain spot instance failover, GHG Protocol Scope 1/2/3 tracking, and GRI 305 compliance reporting.
- **Cross-Campus Resource Mesh**: Observed-Remove Set (ORSet) CRDT for conflict-free distributed equipment and facility reservation synchronization.
- **Dual-Store DB & Merkle Audit Trail**: 9 new tables in SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`) with 100% parity, cryptographic SHA-256 Merkle chain logging, and Prometheus OpenMetrics series.
- **Admin Smart Campus Radar UI & Flutter Mobile**: 5-tab radar dashboard at `/admin/operations/smart-campus`, client React hooks, and mobile Riverpod models/screens.
- **Simulation Harness & Runbooks**: Automated CLI runner `pnpm aims:simulate` and 5 operational runbooks in `docs/operations/`.

## [3.26.0] - 2026-08-20
### Sprint-042: Autonomous Resilience & Predictive Security Engine (ARES)
- Bayesian predictive threat probability forecasting with Laplace smoothing and prior calibration.
- Automated chaos resilience simulation mesh with 6 fault injectors and instant kill-switch circuit breaker.
- Zero-knowledge proof (zk-SNARK Groth16 / BN128) audit verification system.
- Live STIX/TAXII threat intelligence graph with attack path traversal.
- Multi-vector resilience score quantification with AI gap remediation guidance.
