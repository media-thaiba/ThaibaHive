# Changelog

All notable changes to the **ThaibaHive** enterprise autonomous platform will be documented in this file.

## [3.27.0] - 2026-08-20
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
