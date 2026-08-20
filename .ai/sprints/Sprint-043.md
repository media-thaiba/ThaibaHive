# Engineering Contract — Sprint-043

**Sprint ID:** SPRINT-043  
**Sprint Name:** AI-Powered Autonomous Multi-Agent Cross-Campus Resource Optimization & Smart Campus Intelligence (AIMS / AutoOps)  
**Target Release Version:** v3.27.0  
**Contract Date:** 2026-08-20  
**Contract Status:** APPROVED (Reviewed by Claude Code & Architecture Team) — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-043-Recommendation.md`  
**Review Status:** ✅ Approved with commendations (Verified DAG dependencies, tenant isolation in schemas, and ZKP cryptographic parity)  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, technical architecture, detailed task breakdown, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-043**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Building on the production-certified Autonomous Resilience & Predictive Security Engine (ARES) delivered in Sprint-042 (v3.26.0), the Zero-Trust Autonomous Security Mesh (ZASM) delivered in Sprint-041 (v3.25.0), and the Autonomous Security Orchestration and Response (SOAR) engine delivered in Sprint-040 (v3.24.0), Sprint-043 transitions ThaibaHive from **autonomous defensive security resilience** to **predictive operational excellence and multi-campus autonomous resource optimization**.

Sprint-043 introduces the **Autonomous Infrastructure & Multi-Agent Optimization Suite (AIMS / AutoOps)**, transforming institutional operations from reactive administrative workflows to intelligent, self-optimizing autonomous campus ecosystems.

### Core Architectural Pillars for Sprint-043:

1. **Multi-Agent Reinforcement Learning (MARL) Resource Optimization Engine:** Distributed autonomous agent framework using decentralized actor execution with centralized critic coordination (MADDPG/PPO patterns) to optimize campus resource allocation, HVAC energy consumption, and facility schedules without conflicting multi-objective trade-offs.
2. **Predictive HVAC & Smart Energy Optimization:** AI-powered heating, ventilation, and air conditioning controllers incorporating Predicted Mean Vote (PMV) / Predicted Percentage of Dissatisfied (PPD) thermal comfort indices, real-time IoT occupancy telemetry, and weather forecasts to achieve 20–30% energy reduction while preserving 90%+ occupant comfort.
3. **Autonomous Fleet Logistics & Predictive Vehicle Maintenance:** Real-time multi-stop vehicle routing algorithms with traffic awareness, student/staff demand forecasting, dynamic dispatching, driver safety constraints, and machine learning telemetry failure prediction for campus vehicle fleets.
4. **Edge-Native Biometric Attendance & Privacy-Preserving ZKP:** Sub-second on-device neural embedding matching for facial and fingerprint attendance verification, coupled with zero-knowledge proof (zk-SNARK) membership attestation ensuring 0 plaintext biometric data or PII is ever transmitted or stored in central databases.
5. **Cloud Infrastructure Cost Intelligence & Compute Rightsizing:** Automated multi-cloud compute rightsizing, spot instance orchestration with failover guarantees, and reserved capacity planning delivering 30–40% cloud cost reduction across AWS, GCP, and Azure workloads.
6. **Carbon Footprint Calculator & ESG Sustainability Engine:** Real-time Scope 1, Scope 2, and Scope 3 carbon emissions tracking across electricity, vehicle fleets, and cloud infrastructure, generating automated carbon abatement strategies and compliance-grade ESG reporting.
7. **Cross-Campus Distributed Resource Mesh & Load Balancing:** Distributed CRDT-backed asset broker enabling multi-campus institutions to dynamically share classrooms, specialized laboratories, computing clusters, and equipment with sub-5-second reservation resolution.
8. **Dual-Store Persistence, Merkle Audit & OpenMetrics Telemetry:** Full Drizzle ORM dual-store persistence for SQLite and PostgreSQL across 9 new operational tables, SHA-256 Merkle chain audit logging for all automated actions, and Prometheus OpenMetrics series in `/api/metrics`.
9. **Admin Smart Campus Intelligence & AutoOps Radar UI:** Enterprise operational dashboard at `/admin/operations/smart-campus` featuring live Energy Optimization Radar, Autonomous Fleet Dispatcher, Edge Biometric Manager, Cloud Sustainability & Carbon ESG Scorecard, and Cross-Campus Resource Mesh.
10. **End-to-End Simulation Test Harness & Operational Runbooks:** Automated simulation CLI (`scripts/operations/aims-simulation-runner.ts` / `pnpm aims:simulate`) and 5 comprehensive operational runbooks in `docs/`.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|---|---|
| 1 | **Multi-Agent Reinforcement Learning Engine** | Decentralized actor / centralized critic coordination layer managing multi-objective optimization across distributed campus domains with conflict resolution protocols. |
| 2 | **Cross-Campus Agent Mesh & Protocol** | Inter-agent communication over Redis PubSub and event queues supporting negotiation, resource bids, and distributed consensus. |
| 3 | **Safety Guardrails & Human-in-the-Loop Controller** | Bounded policy execution with strict operational threshold constraints and configurable 1-click administrative override/approval gates. |
| 4 | **IoT BMS & Occupancy Sensor Ingestion** | High-throughput ingester for Building Management System (BMS) telemetry, environmental sensors (temperature, humidity, $CO_2$, lux), and room occupancy counts. |
| 5 | **Thermal Comfort & Air Quality Constraint Model** | Mathematical PMV/PPD ISO 7730 thermal comfort calculator and ASHRAE 62.1 air quality model preventing comfort degradation during energy reduction cycles. |
| 6 | **Autonomous HVAC Setpoint Optimizer** | Dynamic thermostat setpoint scheduler adjusting heating/cooling based on occupancy forecasts, ambient weather, and peak utility pricing tariffs. |
| 7 | **Dynamic Fleet Routing & Multi-Stop Dispatcher** | Real-time vehicle route optimization (CVRPTW) factoring live traffic, passenger demand spikes, and fuel efficiency. |
| 8 | **Vehicle Predictive Maintenance Forecaster** | Time-series telemetry anomaly analyzer predicting brake pad wear, battery degradation, engine temperature anomalies, and scheduling preemptive servicing. |
| 9 | **Fleet Safety & Weather Guardrails** | Automated speed governing policies, severe weather route rerouting, and driver continuous duty time enforcement. |
| 10 | **Edge-Native Neural Biometric Matcher** | High-speed local embedding vector comparison ($< 1$s) for facial and fingerprint attendance verification on mobile and edge kiosk hardware. |
| 11 | **Zero-Knowledge Biometric Identity Attestation** | zk-SNARK proof verification validating valid institutional enrollment and attendance without storing or transmitting raw biometric templates. |
| 12 | **Offline Edge Attendance Sync & Outbox** | Resilient offline-first local queue with CRDT merge resolution and cryptographic attestation token emission upon edge reconnection. |
| 13 | **Cloud Compute Rightsizing & Spot Orchestrator** | Multi-cloud resource analyzer calculating CPU/memory utilization and executing automated instance rightsizing and graceful spot instance migration. |
| 14 | **Multi-Source Carbon Emissions Calculator** | GHG Protocol-aligned carbon calculator aggregating Scope 1 (fleet fuel), Scope 2 (grid electricity), and Scope 3 (cloud infrastructure) emissions. |
| 15 | **Carbon Abatement Planner & ESG Exporter** | Actionable sustainability recommendation engine generating ranked carbon abatement playbooks and exportable ESG compliance scorecards. |
| 16 | **Cross-Campus Resource Broker & Scheduler** | Distributed reservation and capacity load-balancer sharing underutilized physical spaces and equipment across multiple campus sites. |
| 17 | **Multi-Campus CRDT Resource State Sync** | Conflict-free replicated data types ensuring real-time multi-master reservation consistency across geographically distributed campus nodes. |
| 18 | **Dual-Store Persistence (SQLite & PostgreSQL)** | Drizzle ORM schemas and type-safe stores for 9 operational entities with 100% schema parity across SQLite (dev) and PostgreSQL (prod). |
| 19 | **Cryptographic Merkle Audit Trail** | Deterministic emission of operational optimization and dispatch events into the SHA-256 Merkle audit chain with verification via `pnpm compliance:verify`. |
| 20 | **Prometheus OpenMetrics Telemetry** | 8 new OpenMetrics series tracking energy savings kWh, fleet efficiency km/L, biometric latency, cloud cost savings $, carbon emissions kg $CO_2e$, and agent coordination score. |
| 21 | **Admin AutoOps REST APIs** | RBAC-protected REST endpoints (`requireAuth`) for all energy, fleet, biometric, cloud cost, carbon, and resource mesh operations. |
| 22 | **Admin Smart Campus Intelligence Radar UI** | Comprehensive 5-tab dashboard at `/admin/operations/smart-campus` featuring live operational radar, interactive dispatchers, and ESG analytics. |
| 23 | **End-to-End Simulation Test Harness** | Automated CLI runner (`scripts/operations/aims-simulation-runner.ts` / `pnpm aims:simulate`) validating 6 cross-campus optimization scenarios. |
| 24 | **Operational Runbooks & AIOS Governance** | 5 engineering runbooks in `docs/` and full updates to `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md`. |
| 25 | **Mobile Operations & Biometric Attendance** | Flutter mobile client integration for live shuttle tracking, local biometric attendance scanner, and multi-campus resource bookings. |

---

### Out of Scope

| Area | Justification |
|---|---|
| Direct High-Voltage Electrical Grid Switching / Physical Relay Modification | Energy optimization generates standardized BACnet/Modbus/MQTT control setpoints dispatched to existing Building Management Systems; direct manipulation of high-voltage physical electrical switchgear is managed by certified building hardware. |
| Autonomous Vehicle Drive-by-Wire Steering / Braking Actuation | Fleet logistics provides intelligent turn-by-turn routing, stop scheduling, and driver dispatch instructions; automated vehicle drive-by-wire robotics is out of scope. |
| Proprietary Third-Party Hardware Kiosk Manufacturing | Edge biometric attendance integrates with standard Android/iOS mobile cameras, USB fingerprint scanners, and WebRTC video streams; custom ASIC hardware manufacturing is out of scope. |
| Unverified Automatic Cloud Infrastructure Deprovisioning | Cloud cost rightsizing generates safe sizing recommendations and orchestrates pre-warmed spot migrations; destructive production database deprovisioning requires administrative confirmation. |
| Off-Chain Raw Carbon Credit Trading & Financial Settlement | The platform calculates and certifies compliance-grade carbon emissions data; direct execution of carbon credit financial market trades is out of scope. |

---

## 3. Technical Architecture & Component Interactions

### Autonomous Infrastructure & Multi-Agent Optimization Suite (AIMS / AutoOps) Flow

```mermaid
flowchart TD
    subgraph Multi-Agent Reinforcement Learning Coordination Layer
        MARL[Centralized MARL Coordinator\nActor-Critic Policy Engine]
        MESH[Cross-Campus Redis PubSub Mesh]
        SAFETY[Safety Guardrails & Human Approval Gate]
        MARL <--> MESH
        MARL --> SAFETY
    end

    subgraph Domain 1: Smart HVAC & Campus Energy Optimization
        BMS[IoT BMS & Environmental Sensors\nTemp, Humidity, Lux, Occupancy] --> ENV_INGEST[Telemetry & Occupancy Forecaster]
        ENV_INGEST --> COMFORT[PMV/PPD Thermal Comfort Calculator]
        COMFORT --> HVAC_OPT[Autonomous HVAC Setpoint Optimizer]
        HVAC_OPT <--> MARL
        HVAC_OPT --> BACNET[BACnet / Modbus / MQTT Dispatcher]
    end

    subgraph Domain 2: Autonomous Fleet Logistics & Predictive Maintenance
        GPS[GPS & Vehicle OBD-II Telemetry] --> FLEET_INGEST[Fleet Telemetry Ingester]
        FLEET_INGEST --> MAINT_PRED[Predictive Maintenance Forecaster]
        FLEET_INGEST --> ROUTE_OPT[Dynamic Multi-Stop Vehicle Router]
        ROUTE_OPT <--> MARL
        ROUTE_OPT --> DRIVER_DISPATCH[Driver Dispatch & Safety Controller]
    end

    subgraph Domain 3: Edge-Native Biometric Attendance & ZKP
        CAMERA[Mobile / Edge Camera & Scanner] --> NEURAL_EMBED[On-Device Neural Embedder]
        NEURAL_EMBED --> ZKP_PROVER[zk-SNARK Biometric Prover]
        ZKP_PROVER --> OFFLINE_SYNC[CRDT Offline Outbox & Attestation]
        OFFLINE_SYNC --> ATTENDANCE_VERIFY[ZKP Attendance Verification Engine]
    end

    subgraph Domain 4: Cloud Cost Optimization & ESG Carbon Calculator
        CLOUD_API[AWS / GCP / Azure Billing & Telemetry] --> CLOUD_OPT[Compute Rightsizing & Spot Engine]
        ENERGY_DATA[HVAC kWh + Fleet Liters + Cloud Compute] --> CARBON_CALC[Scope 1, 2, 3 Carbon Calculator]
        CARBON_CALC --> ESG_REP[Carbon Abatement & ESG Reporter]
        CLOUD_OPT <--> MARL
    end

    subgraph Domain 5: Cross-Campus Distributed Resource Mesh
        CAMPUS_RESOURCES[Rooms, Labs, Computing, Fleet] --> RES_BROKER[Cross-Campus Resource Broker]
        RES_BROKER --> CRDT_SYNC[Multi-Campus CRDT State Mesh]
        CRDT_SYNC <--> MARL
    end

    subgraph Persistence, Merkle Audit & Operational Radar UI
        MARL & HVAC_OPT & ROUTE_OPT & ATTENDANCE_VERIFY & CLOUD_OPT & RES_BROKER --> DB[(Dual-Store Persistence\nSQLite & PostgreSQL)]
        MARL & HVAC_OPT & ROUTE_OPT & ATTENDANCE_VERIFY & CLOUD_OPT & RES_BROKER --> MERKLE[SHA-256 Merkle Audit Trail]
        MARL & HVAC_OPT & ROUTE_OPT & ATTENDANCE_VERIFY & CLOUD_OPT & RES_BROKER --> METRICS[Prometheus OpenMetrics Telemetry]
        
        DB & MERKLE & METRICS --> RADAR_UI[Admin Smart Campus Intelligence Radar\n/admin/operations/smart-campus]
    end
```

---

## 4. Implementation Task Breakdown

> Tasks are organized across 9 logical implementation phases in strict dependency order. Foundational reinforcement learning coordinators, sensor ingesters, and cryptographic provers MUST be constructed and unit-tested before downstream dispatchers, UI radar panels, simulation harnesses, and operational runbooks are built.

---

### Phase 1 — Multi-Agent Reinforcement Learning (MARL) & Cross-Campus Coordination

#### AIMS-001 — Multi-Agent Reinforcement Learning Engine & Centralized Critic Coordination

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-001 |
| **Phase** | Phase 1 — Multi-Agent Reinforcement Learning (MARL) & Cross-Campus Coordination |
| **Description** | Implement the core Multi-Agent Reinforcement Learning (MARL) engine in `src/lib/operations/marl/marl-engine.ts`, `marl-types.ts`, and `centralized-critic.ts`. Implement decentralized actor policies with centralized critic value estimation (Multi-Agent Deep Deterministic Policy Gradient / Multi-Agent PPO architecture). Define standardized state-action-reward representations for campus operational agents (HVAC Agent, Fleet Agent, Cloud Cost Agent, Resource Mesh Agent). Support policy gradient updates, discount factor ($\gamma = 0.95$), experience replay buffering, and reward normalization. |
| **Files** | `src/lib/operations/marl/marl-types.ts` [NEW] · `src/lib/operations/marl/centralized-critic.ts` [NEW] · `src/lib/operations/marl/marl-engine.ts` [NEW] · `src/lib/__tests__/operations/marl/marl-engine.test.ts` [NEW] |
| **Dependencies** | None (Foundational Core Primitive) |
| **Acceptance Criteria** | 1. `MarlEngine` coordinates multiple heterogeneous agents simultaneously with independent observation spaces and shared global value estimation.<br>2. `CentralizedCritic` evaluates joint state-action value functions $Q(s, a_1, a_2, \dots, a_n)$ preventing non-stationary environment oscillations.<br>3. Computes action selection in $< 10$ milliseconds per agent cycle.<br>4. Supports episodic reward tracking and Pareto-optimal multi-objective policy convergence.<br>5. 100% unit test coverage validating mathematical Bellman updates, policy gradients, and actor-critic convergence across 20+ synthetic multi-agent scenarios. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/marl/marl-engine`. Assert mathematical soundness of value functions, gradient steps, and multi-agent action outputs. |
| **Estimated Complexity** | High |

---

#### AIMS-002 — Cross-Campus Agent Communication Mesh & Conflict Resolution Protocol

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-002 |
| **Phase** | Phase 1 — Multi-Agent Reinforcement Learning (MARL) & Cross-Campus Coordination |
| **Description** | Implement the distributed inter-agent messaging and negotiation mesh in `src/lib/operations/marl/agent-communication-mesh.ts` and `conflict-resolution-protocol.ts`. Leverage Redis PubSub (from Sprint-038) for sub-50ms message propagation across distributed campus nodes. Implement Vickrey-Clarke-Groves (VCG) auction mechanisms and Nash bargaining protocols to resolve competing resource claims (e.g. HVAC energy reduction vs. Laboratory climate stability, Fleet vehicle dispatch vs. On-site charging window). |
| **Files** | `src/lib/operations/marl/agent-communication-mesh.ts` [NEW] · `src/lib/operations/marl/conflict-resolution-protocol.ts` [NEW] · `src/lib/__tests__/operations/marl/agent-communication-mesh.test.ts` [NEW] · `src/lib/__tests__/operations/marl/conflict-resolution.test.ts` [NEW] |
| **Dependencies** | AIMS-001 |
| **Acceptance Criteria** | 1. `AgentCommunicationMesh` provides reliable broadcast, multicast, and direct peer-to-peer agent messaging with message deduplication.<br>2. `ConflictResolutionProtocol` resolves multi-agent resource conflicts deterministically in $< 100$ milliseconds.<br>3. Enforces utility priority weighting (Safety & Security $>$ Occupant Comfort $>$ Operational Efficiency $>$ Cost Savings).<br>4. Handles simulated network partitions gracefully with local autonomous fallback.<br>5. Unit tests assert message delivery, auction clearing prices, and conflict resolution fairness. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/marl/agent-communication-mesh` and `conflict-resolution`. |
| **Estimated Complexity** | High |

---

#### AIMS-003 — Autonomous Decision Safety Guardrails & Human-in-the-Loop Approval Controller

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-003 |
| **Phase** | Phase 1 — Multi-Agent Reinforcement Learning (MARL) & Cross-Campus Coordination |
| **Description** | Develop the operational safety guardrails module (`src/lib/operations/marl/operational-guardrails.ts`) and human-in-the-loop approval controller (`src/lib/operations/marl/human-approval-controller.ts`). Enforce hard operational safety invariants (e.g. HVAC temperature cannot drift outside $[20^\circ\text{C}, 26^\circ\text{C}]$, Fleet routes cannot exceed maximum driver shift hours, Cloud rightsizing cannot drop CPU capacity below peak provisioned load). Provide automated classification into Autonomous Execution vs. Approval-Required Workflows with 1-click administrative review. |
| **Files** | `src/lib/operations/marl/operational-guardrails.ts` [NEW] · `src/lib/operations/marl/human-approval-controller.ts` [NEW] · `src/lib/__tests__/operations/marl/operational-guardrails.test.ts` [NEW] · `src/lib/__tests__/operations/marl/human-approval-controller.test.ts` [NEW] |
| **Dependencies** | AIMS-001, AIMS-002 |
| **Acceptance Criteria** | 1. `OperationalGuardrails` intercepts all agent action proposals and rejects any action violating configured safety bounds.<br>2. Actions exceeding risk or financial thresholds (e.g. $> \$500$ operational change) are routed to `HumanApprovalController` with pending execution queue.<br>3. Supports emergency operational kill-switch reverting all agents to default static schedules in $< 100$ms.<br>4. Auto-expires unapproved pending decisions with safe fallback.<br>5. Unit tests verify invariant clamping, approval queue state transitions, and kill-switch abort. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/marl/operational-guardrails` and `human-approval-controller`. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — Smart HVAC, Occupancy & Campus Energy Optimization

#### AIMS-004 — IoT Building Management System (BMS) Sensor Ingester & Occupancy Forecaster

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-004 |
| **Phase** | Phase 2 — Smart HVAC, Occupancy & Campus Energy Optimization |
| **Description** | Implement the IoT Building Management System (BMS) sensor telemetry ingestion engine (`src/lib/operations/energy/bms-telemetry-ingester.ts`), `energy-types.ts`, and occupancy forecasting engine (`src/lib/operations/energy/occupancy-forecaster.ts`). Ingest high-frequency environmental sensor streams (indoor temperature, relative humidity, $CO_2$ parts per million, ambient lux, acoustic energy) and campus Wi-Fi/access badge events. Build time-series occupancy forecasts per building zone across 15-minute, 1-hour, and 24-hour horizons. |
| **Files** | `src/lib/operations/energy/energy-types.ts` [NEW] · `src/lib/operations/energy/bms-telemetry-ingester.ts` [NEW] · `src/lib/operations/energy/occupancy-forecaster.ts` [NEW] · `src/lib/__tests__/operations/energy/bms-telemetry-ingester.test.ts` [NEW] · `src/lib/__tests__/operations/energy/occupancy-forecaster.test.ts` [NEW] |
| **Dependencies** | None (Core Energy Primitive) |
| **Acceptance Criteria** | 1. Ingests normalized telemetry packets across BACnet, Modbus, MQTT, and REST payloads.<br>2. `OccupancyForecaster` predicts zone occupancy headcount with $\ge 85\%$ accuracy using historical patterns and calendar schedules.<br>3. Handles out-of-order and missing sensor readings with Kalman filter smoothing.<br>4. Ingestion pipeline processes 10,000+ sensor points/sec with $< 2$ms processing latency.<br>5. Unit tests assert format parsing, Kalman smoothing, occupancy forecasting, and error handling. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/energy/bms-telemetry-ingester` and `occupancy-forecaster`. |
| **Estimated Complexity** | High |

---

#### AIMS-005 — Thermal Comfort Index (PMV/PPD) & Air Quality Constraint Modeling Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-005 |
| **Phase** | Phase 2 — Smart HVAC, Occupancy & Campus Energy Optimization |
| **Description** | Implement the ISO 7730 Predicted Mean Vote (PMV) and Predicted Percentage of Dissatisfied (PPD) thermal comfort calculation engine (`src/lib/operations/energy/thermal-comfort-model.ts`) and ASHRAE 62.1 indoor air quality model (`src/lib/operations/energy/air-quality-model.ts`). Compute PMV as a function of dry-bulb air temperature, mean radiant temperature, relative humidity, air velocity, occupant metabolic rate (met), and clothing insulation (clo). Enforce strict $CO_2$ ($< 1,000$ ppm) and ventilation thresholds. |
| **Files** | `src/lib/operations/energy/thermal-comfort-model.ts` [NEW] · `src/lib/operations/energy/air-quality-model.ts` [NEW] · `src/lib/__tests__/operations/energy/thermal-comfort-model.test.ts` [NEW] · `src/lib/__tests__/operations/energy/air-quality-model.test.ts` [NEW] |
| **Dependencies** | AIMS-004 |
| **Acceptance Criteria** | 1. `ThermalComfortModel` implements exact Fanger PMV/PPD mathematical equations yielding PMV in range $[-3.0, +3.0]$ and PPD in $[5\%, 100\%]$.<br>2. Identifies the optimal comfort zone ($-0.5 \le \text{PMV} \le +0.5$, $\text{PPD} \le 10\%$).<br>3. `AirQualityModel` dynamically calculates required outdoor air flow rate based on zone occupancy and contaminant generation rate.<br>4. Computes comfort and ventilation constraints in $< 1$ millisecond per building zone.<br>5. Unit tests assert mathematical precision against ISO 7730 benchmark validation tables. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/energy/thermal-comfort-model` and `air-quality-model`. |
| **Estimated Complexity** | High |

---

#### AIMS-006 — Autonomous HVAC Setpoint & Microgrid Energy Optimization Dispatcher

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-006 |
| **Phase** | Phase 2 — Smart HVAC, Occupancy & Campus Energy Optimization |
| **Description** | Implement the autonomous HVAC setpoint optimizer (`src/lib/operations/energy/hvac-optimizer.ts`) and campus microgrid energy dispatcher (`src/lib/operations/energy/microgrid-energy-dispatcher.ts`). Integrate with the MARL engine (AIMS-001) to dynamically adjust cooling/heating setpoints, pre-cooling schedules during low-tariff off-peak periods, solar PV self-consumption optimization, and battery storage charge/discharge cycles. Guarantee 20–30% energy reduction while maintaining thermal comfort within ISO 7730 limits. |
| **Files** | `src/lib/operations/energy/hvac-optimizer.ts` [NEW] · `src/lib/operations/energy/microgrid-energy-dispatcher.ts` [NEW] · `src/lib/__tests__/operations/energy/hvac-optimizer.test.ts` [NEW] · `src/lib/__tests__/operations/energy/microgrid-energy-dispatcher.test.ts` [NEW] |
| **Dependencies** | AIMS-001, AIMS-004, AIMS-005 |
| **Acceptance Criteria** | 1. Generates zone-specific heating/cooling setpoints optimizing total kWh consumption and peak electrical demand charges.<br>2. `MicrogridEnergyDispatcher` orchestrates campus solar PV, grid import, and battery energy storage dispatch.<br>3. Automatically clamps setpoint recommendations to prevent thermal discomfort violations.<br>4. Emits control commands in standard JSON/BACnet format for downstream BMS actuators.<br>5. Unit tests verify energy savings calculation, pre-cooling logic, and constraint enforcement. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/energy/hvac-optimizer` and `microgrid-energy-dispatcher`. |
| **Estimated Complexity** | High |

---

### Phase 3 — Autonomous Fleet Logistics & Predictive Vehicle Maintenance

#### AIMS-007 — Fleet Telemetry & Multi-Stop Dynamic Vehicle Routing Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-007 |
| **Phase** | Phase 3 — Autonomous Fleet Logistics & Predictive Vehicle Maintenance |
| **Description** | Implement the campus vehicle fleet telemetry ingester (`src/lib/operations/fleet/fleet-telemetry-ingester.ts`), `fleet-types.ts`, and dynamic multi-stop vehicle routing engine (`src/lib/operations/fleet/vehicle-routing-engine.ts`). Model the Capacitated Vehicle Routing Problem with Time Windows (CVRPTW) for campus shuttles, security patrol vehicles, and logistics vans. Incorporate real-time GPS locations, passenger pickup requests, campus traffic congestion, and battery state of charge (SoC) for electric vehicles. |
| **Files** | `src/lib/operations/fleet/fleet-types.ts` [NEW] · `src/lib/operations/fleet/fleet-telemetry-ingester.ts` [NEW] · `src/lib/operations/fleet/vehicle-routing-engine.ts` [NEW] · `src/lib/__tests__/operations/fleet/fleet-telemetry-ingester.test.ts` [NEW] · `src/lib/__tests__/operations/fleet/vehicle-routing-engine.test.ts` [NEW] |
| **Dependencies** | None (Core Fleet Primitive) |
| **Acceptance Criteria** | 1. Ingests real-time vehicle GPS, speed, odometer, fuel/SoC, and passenger count telemetry.<br>2. `VehicleRoutingEngine` solves multi-vehicle CVRPTW using genetic algorithms and Clarke-Wright savings heuristics in $< 5$ seconds.<br>3. Dynamically re-optimizes routes upon new passenger requests or traffic delay alerts.<br>4. Reduces total fleet traveled kilometers by 15–25% compared to static fixed routes.<br>5. Unit tests verify route feasibility, vehicle capacity constraints, time window adherence, and re-routing triggers. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/fleet/fleet-telemetry-ingester` and `vehicle-routing-engine`. |
| **Estimated Complexity** | High |

---

#### AIMS-008 — Vehicle Predictive Maintenance Analytics & Sensor Telemetry Failure Forecaster

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-008 |
| **Phase** | Phase 3 — Autonomous Fleet Logistics & Predictive Vehicle Maintenance |
| **Description** | Implement the vehicle predictive maintenance analytics engine (`src/lib/operations/fleet/predictive-maintenance.ts`) and failure forecasting model (`src/lib/operations/fleet/vehicle-health-forecaster.ts`). Ingest OBD-II diagnostic trouble codes (DTC), engine coolant temperatures, brake pad sensor thickness, tire pressure (TPMS), and EV battery cell temperature variance. Predict component failure probabilities 7–30 days before critical breakdown and automatically schedule maintenance windows. |
| **Files** | `src/lib/operations/fleet/predictive-maintenance.ts` [NEW] · `src/lib/operations/fleet/vehicle-health-forecaster.ts` [NEW] · `src/lib/__tests__/operations/fleet/predictive-maintenance.test.ts` [NEW] · `src/lib/__tests__/operations/fleet/vehicle-health-forecaster.test.ts` [NEW] |
| **Dependencies** | AIMS-007 |
| **Acceptance Criteria** | 1. Calculates composite Health Score (0–100) per vehicle across powertrain, braking, battery/electrical, and tires.<br>2. Predicts mechanical and battery degradation using exponential degradation models and sensor trend extrapolation.<br>3. Automatically flags urgent servicing needs ($P(\text{Failure}) > 0.70$) and reserves maintenance depot slots.<br>4. Achieves $< 2\%$ false positive rate on baseline failure test datasets.<br>5. Unit tests verify failure probability forecasting, health score calculation, and maintenance ticket creation. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/fleet/predictive-maintenance` and `vehicle-health-forecaster`. |
| **Estimated Complexity** | Medium-High |

---

#### AIMS-009 — Fleet Safety Constraint Enforcer & Weather-Aware Route Dispatcher

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-009 |
| **Phase** | Phase 3 — Autonomous Fleet Logistics & Predictive Vehicle Maintenance |
| **Description** | Implement the fleet safety constraint enforcer (`src/lib/operations/fleet/fleet-safety-enforcer.ts`) and weather-aware route dispatcher (`src/lib/operations/fleet/weather-aware-dispatcher.ts`). Integrate with external weather APIs to ingest precipitation, fog, and storm warnings. Enforce campus speed limits ($< 25\text{ km/h}$ in pedestrian zones), maximum continuous driving limits (4 hours max before mandatory rest), and automatically reroute shuttles away from flooded or blocked campus access roads. |
| **Files** | `src/lib/operations/fleet/fleet-safety-enforcer.ts` [NEW] · `src/lib/operations/fleet/weather-aware-dispatcher.ts` [NEW] · `src/lib/__tests__/operations/fleet/fleet-safety-enforcer.test.ts` [NEW] · `src/lib/__tests__/operations/fleet/weather-aware-dispatcher.test.ts` [NEW] |
| **Dependencies** | AIMS-007, AIMS-008 |
| **Acceptance Criteria** | 1. Detects safety violations (speeding, harsh braking, continuous shift overrun) and emits real-time alerts.<br>2. Adjusts estimated transit times and routing safety margins based on real-time weather conditions.<br>3. Reroutes vehicles around restricted zones or hazardous road conditions.<br>4. Provides manual dispatcher override capabilities with audit logging.<br>5. Unit tests verify safety rule evaluations, weather penalty calculations, and dynamic rerouting. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/fleet/fleet-safety-enforcer` and `weather-aware-dispatcher`. |
| **Estimated Complexity** | Medium |

---

### Phase 4 — Edge-Native Biometric Attendance & Privacy-Preserving ZKP

#### AIMS-010 — Edge-Native Neural Embedding Attendance Verification Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-010 |
| **Phase** | Phase 4 — Edge-Native Biometric Attendance & Privacy-Preserving ZKP |
| **Description** | Implement the edge-native biometric neural embedding matcher (`src/lib/operations/biometrics/neural-biometric-matcher.ts`), `biometric-types.ts`, and edge verification engine (`src/lib/operations/biometrics/edge-verification-engine.ts`). Support 128-dimensional and 512-dimensional facial/fingerprint embedding vectors. Perform normalized cosine similarity matching ($\text{sim}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$) against locally encrypted authorized enrollment templates in $< 50$ milliseconds on edge devices without transmitting raw photos or fingerprint images. |
| **Files** | `src/lib/operations/biometrics/biometric-types.ts` [NEW] · `src/lib/operations/biometrics/neural-biometric-matcher.ts` [NEW] · `src/lib/operations/biometrics/edge-verification-engine.ts` [NEW] · `src/lib/__tests__/operations/biometrics/neural-biometric-matcher.test.ts` [NEW] · `src/lib/__tests__/operations/biometrics/edge-verification-engine.test.ts` [NEW] |
| **Dependencies** | None (Core Biometric Primitive) |
| **Acceptance Criteria** | 1. Performs high-speed vector matching against 1,000+ local enrolled templates in $< 50$ milliseconds.<br>2. Implements configurable thresholding with False Acceptance Rate (FAR) $< 0.001\%$ and False Rejection Rate (FRR) $< 0.5\%$.<br>3. Raw biometric images or video frames are discarded immediately after embedding extraction in memory.<br>4. Local template store encrypted with AES-256-GCM using hardware-derived keys.<br>5. Unit tests assert mathematical cosine similarity, matching accuracy, latency bounds, and memory isolation. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/biometrics/neural-biometric-matcher` and `edge-verification-engine`. |
| **Estimated Complexity** | High |

---

#### AIMS-011 — Zero-Knowledge Proof (ZKP) Biometric Identity Attestation & Membership Verifier

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-011 |
| **Phase** | Phase 4 — Edge-Native Biometric Attendance & Privacy-Preserving ZKP |
| **Description** | Implement the zero-knowledge biometric attendance attestation circuit and verifier (`src/lib/operations/biometrics/zk-biometric-verifier.ts`) leveraging zk-SNARK primitives (from Sprint-042). The edge device generates a cryptographic proof $\pi$ demonstrating: (1) The user holds a valid biometric embedding matching a leaf in the institution's enrolled Merkle tree, (2) The timestamp falls within the scheduled attendance session window, and (3) The user identity is authentic — without revealing the user's biometric vector, national ID, or facial features to the backend server. |
| **Files** | `src/lib/operations/biometrics/zk-biometric-verifier.ts` [NEW] · `src/lib/operations/biometrics/zk-biometric-circuits.ts` [NEW] · `src/lib/__tests__/operations/biometrics/zk-biometric-verifier.test.ts` [NEW] |
| **Dependencies** | AIMS-010 |
| **Acceptance Criteria** | 1. Generates and verifies valid zk-SNARK attendance proofs with BN254 elliptic curves.<br>2. Verifier checks proof validity against public session Merkle root in $< 50$ milliseconds on server backend.<br>3. Zero plaintext biometric data or user PII is revealed in the generated attestation payload.<br>4. Prevents proof replay attacks using cryptographic epoch nonces and nullifiers.<br>5. Unit tests verify proof generation, verification soundness, replay rejection, and zero-knowledge privacy guarantees. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/biometrics/zk-biometric-verifier`. |
| **Estimated Complexity** | High |

---

#### AIMS-012 — Offline-First Edge Synchronization & Tamper-Resistant Attendance Outbox

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-012 |
| **Phase** | Phase 4 — Edge-Native Biometric Attendance & Privacy-Preserving ZKP |
| **Description** | Implement the offline-first edge attendance synchronization pipeline (`src/lib/operations/biometrics/edge-attendance-sync.ts`) and tamper-resistant local outbox (`src/lib/operations/biometrics/attendance-outbox.ts`). When campus edge kiosks or mobile attendance scanners lose Wi-Fi/cellular connectivity, securely buffer signed ZKP attendance records in an encrypted local CRDT outbox. Upon connection restoration, execute batch synchronization with automatic duplicate reconciliation and Merkle audit logging. |
| **Files** | `src/lib/operations/biometrics/attendance-outbox.ts` [NEW] · `src/lib/operations/biometrics/edge-attendance-sync.ts` [NEW] · `src/lib/__tests__/operations/biometrics/attendance-outbox.test.ts` [NEW] · `src/lib/__tests__/operations/biometrics/edge-attendance-sync.test.ts` [NEW] |
| **Dependencies** | AIMS-010, AIMS-011 |
| **Acceptance Criteria** | 1. Buffers 50,000+ attendance records offline with cryptographic HMAC chaining and local disk encryption.<br>2. Automatic background sync initiates within 3 seconds of network re-establishment.<br>3. Resolves out-of-order and concurrent batch syncs without dropping or duplicating attendance punches.<br>4. Emits verified attendance records to central database and Merkle audit trail.<br>5. Unit tests assert offline persistence, replay protection, network reconnect sync, and conflict resolution. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/biometrics/attendance-outbox` and `edge-attendance-sync`. |
| **Estimated Complexity** | Medium |

---

### Phase 5 — Cloud Cost Rightsizing, Carbon Footprint & ESG Analytics

#### AIMS-013 — Multi-Cloud Compute Rightsizing & Spot Instance Orchestration Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-013 |
| **Phase** | Phase 5 — Cloud Cost Rightsizing, Carbon Footprint & ESG Analytics |
| **Description** | Implement the multi-cloud compute cost optimization engine (`src/lib/operations/cloud/cloud-cost-optimizer.ts`), `cloud-types.ts`, and spot instance orchestrator (`src/lib/operations/cloud/spot-instance-orchestrator.ts`). Connect to AWS Cost Explorer / CloudWatch, GCP Cloud Billing, and Azure Cost Management telemetry. Analyze CPU, memory, IOPS, and network utilization across cluster workloads. Generate automated rightsizing recommendations (e.g. downscale over-provisioned staging clusters) and orchestrate graceful spot instance failover with on-demand pre-warming to reduce cloud spend by 30–40%. |
| **Files** | `src/lib/operations/cloud/cloud-types.ts` [NEW] · `src/lib/operations/cloud/cloud-cost-optimizer.ts` [NEW] · `src/lib/operations/cloud/spot-instance-orchestrator.ts` [NEW] · `src/lib/__tests__/operations/cloud/cloud-cost-optimizer.test.ts` [NEW] · `src/lib/__tests__/operations/cloud/spot-instance-orchestrator.test.ts` [NEW] |
| **Dependencies** | None (Core Cloud Primitive) |
| **Acceptance Criteria** | 1. Ingests and normalizes multi-cloud cost and utilization metrics across compute instances, containers, and serverless.<br>2. Identifies idle and over-provisioned workloads with projected dollar savings.<br>3. `SpotInstanceOrchestrator` manages spot instance lifecycle with automated pre-drain and seamless fallback to on-demand instances.<br>4. Zero service disruption or downtime during simulated spot terminations.<br>5. Unit tests assert cost calculation accuracy, rightsizing recommendations, and spot migration state machines. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/cloud/cloud-cost-optimizer` and `spot-instance-orchestrator`. |
| **Estimated Complexity** | High |

---

#### AIMS-014 — Multi-Source Carbon Footprint Calculator & Scope 1/2/3 Emissions Tracker

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-014 |
| **Phase** | Phase 5 — Cloud Cost Rightsizing, Carbon Footprint & ESG Analytics |
| **Description** | Implement the multi-source carbon emissions calculation engine (`src/lib/operations/sustainability/carbon-calculator.ts`), `sustainability-types.ts`, and greenhouse gas (GHG) emission tracker (`src/lib/operations/sustainability/ghg-emissions-tracker.ts`). Ingest: (1) Scope 1 Direct Emissions from campus fleet fuel combustion ($kg\ CO_2e / \text{liter}$), (2) Scope 2 Indirect Emissions from grid electricity consumption adjusted for regional grid carbon intensity ($g\ CO_2e / \text{kWh}$), and (3) Scope 3 Cloud & Value Chain Emissions from cloud data center regional Power Usage Effectiveness (PUE) and server embodied carbon. |
| **Files** | `src/lib/operations/sustainability/sustainability-types.ts` [NEW] · `src/lib/operations/sustainability/carbon-calculator.ts` [NEW] · `src/lib/operations/sustainability/ghg-emissions-tracker.ts` [NEW] · `src/lib/__tests__/operations/sustainability/carbon-calculator.test.ts` [NEW] · `src/lib/__tests__/operations/sustainability/ghg-emissions-tracker.test.ts` [NEW] |
| **Dependencies** | AIMS-004, AIMS-007, AIMS-013 |
| **Acceptance Criteria** | 1. Calculates GHG Protocol Scope 1, Scope 2, and Scope 3 emissions in real time with localized emission factors.<br>2. Quantifies total institutional carbon footprint in metric tons of $CO_2$ equivalent ($tCO_2e$).<br>3. Calculates carbon emission reductions achieved by HVAC optimization and fleet rerouting.<br>4. Processes emission updates in $< 10$ milliseconds.<br>5. Unit tests assert mathematical formula compliance against standard IPCC and GHG Protocol benchmarks. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/sustainability/carbon-calculator` and `ghg-emissions-tracker`. |
| **Estimated Complexity** | Medium-High |

---

#### AIMS-015 — Automated Carbon Reduction Strategy Planner & ESG Compliance Reporting

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-015 |
| **Phase** | Phase 5 — Cloud Cost Rightsizing, Carbon Footprint & ESG Analytics |
| **Description** | Implement the automated carbon reduction strategy planner (`src/lib/operations/sustainability/carbon-reduction-planner.ts`) and ESG compliance reporting engine (`src/lib/operations/sustainability/esg-report-generator.ts`). Synthesize multi-domain operational data to propose ranked carbon abatement initiatives (e.g. "Shift compute workloads to renewable-powered cloud region between 12:00–16:00 to reduce Scope 3 emissions by 18%"). Generate audit-ready ESG sustainability reports complying with GRI, SASB, and ISO 14064 standards. |
| **Files** | `src/lib/operations/sustainability/carbon-reduction-planner.ts` [NEW] · `src/lib/operations/sustainability/esg-report-generator.ts` [NEW] · `src/lib/__tests__/operations/sustainability/carbon-reduction-planner.test.ts` [NEW] · `src/lib/__tests__/operations/sustainability/esg-report-generator.test.ts` [NEW] |
| **Dependencies** | AIMS-014 |
| **Acceptance Criteria** | 1. `CarbonReductionPlanner` generates prioritized carbon abatement roadmaps with estimated carbon reduction ($kg\ CO_2e$) and financial ROI.<br>2. `EsgReportGenerator` exports structured JSON, Markdown, and PDF sustainability summaries.<br>3. Validates compliance alignment against standard ESG reporting frameworks.<br>4. Integrates with MARL engine to execute approved automated green dispatch policies.<br>5. Unit tests verify abatement ranking algorithms, report generation, and data accuracy. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/sustainability/carbon-reduction-planner` and `esg-report-generator`. |
| **Estimated Complexity** | Medium |

---

### Phase 6 — Distributed Cross-Campus Resource Mesh & Load Balancing

#### AIMS-016 — Cross-Campus Resource Broker & Capacity Optimization Engine

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-016 |
| **Phase** | Phase 6 — Distributed Cross-Campus Resource Mesh & Load Balancing |
| **Description** | Implement the cross-campus resource broker (`src/lib/operations/mesh/campus-resource-broker.ts`), `mesh-types.ts`, and capacity optimization engine (`src/lib/operations/mesh/capacity-optimizer.ts`). Manage shared physical and digital institutional assets across distributed campus sites (lecture halls, advanced research laboratories, high-performance computing clusters, specialized medical/engineering simulators, fleet vans). Dynamically balance resource allocation to increase asset utilization by 30–50%. |
| **Files** | `src/lib/operations/mesh/mesh-types.ts` [NEW] · `src/lib/operations/mesh/campus-resource-broker.ts` [NEW] · `src/lib/operations/mesh/capacity-optimizer.ts` [NEW] · `src/lib/__tests__/operations/mesh/campus-resource-broker.test.ts` [NEW] · `src/lib/__tests__/operations/mesh/capacity-optimizer.test.ts` [NEW] |
| **Dependencies** | None (Core Mesh Primitive) |
| **Acceptance Criteria** | 1. Catalogs shared campus assets with availability calendars, location tags, and capacity constraints.<br>2. `CapacityOptimizer` matches inter-campus resource booking requests with underutilized facilities in $< 5$ seconds.<br>3. Computes utilization rates, idle capacity metrics, and cost savings from cross-campus sharing.<br>4. Supports priority reservation quotas for host campus departments.<br>5. Unit tests assert booking allocation algorithms, capacity constraints, and utilization metrics. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/mesh/campus-resource-broker` and `capacity-optimizer`. |
| **Estimated Complexity** | Medium-High |

---

#### AIMS-017 — Multi-Campus CRDT State Synchronization & Distributed Reservation Scheduler

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-017 |
| **Phase** | Phase 6 — Distributed Cross-Campus Resource Mesh & Load Balancing |
| **Description** | Implement multi-campus Conflict-Free Replicated Data Type (CRDT) state synchronization (`src/lib/operations/mesh/resource-crdt-sync.ts`) and distributed reservation scheduler (`src/lib/operations/mesh/distributed-reservation-scheduler.ts`). Leverage state-based ORSet (Observed-Remove Set) and LWW-Register (Last-Write-Wins) CRDT structures to synchronize resource schedules across distributed campus server nodes with 0 booking collision risk, even during intermittent cross-campus WAN network partitions. |
| **Files** | `src/lib/operations/mesh/resource-crdt-sync.ts` [NEW] · `src/lib/operations/mesh/distributed-reservation-scheduler.ts` [NEW] · `src/lib/__tests__/operations/mesh/resource-crdt-sync.test.ts` [NEW] · `src/lib/__tests__/operations/mesh/distributed-reservation-scheduler.test.ts` [NEW] |
| **Dependencies** | AIMS-016 |
| **Acceptance Criteria** | 1. Implements mathematically sound CRDT state merge functions for cross-campus resource states.<br>2. Guarantees deterministic convergence across multi-master distributed nodes.<br>3. Prevents double-booking conflicts with deterministic timestamp and node ID tie-breaking.<br>4. Synchronizes state updates in $< 200$ milliseconds under normal network conditions.<br>5. Unit tests verify concurrent partition booking, state merge convergence, and zero double-booking. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/mesh/resource-crdt-sync` and `distributed-reservation-scheduler`. |
| **Estimated Complexity** | High |

---

### Phase 7 — Persistence, Merkle Audit & OpenMetrics Telemetry

#### AIMS-018 — Dual-Store Database Persistence for AIMS/AutoOps Entities (SQLite & PostgreSQL)

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-018 |
| **Phase** | Phase 7 — Persistence, Merkle Audit & OpenMetrics Telemetry |
| **Description** | Define database schema tables for all AIMS/AutoOps entities and implement runtime data access in `src/lib/operations/persistence/aims-db-store.ts`. Create 9 tables: `aims_agents`, `aims_energy_telemetry`, `aims_energy_optimizations`, `aims_fleet_vehicles`, `aims_fleet_dispatches`, `aims_biometric_logs`, `aims_cloud_costs`, `aims_carbon_metrics`, and `aims_campus_resources` in SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`). Maintain 100% schema parity, automatic timestamp handling, JSON typing, and non-blocking asynchronous persistence. |
| **Files** | `packages/db/schema.ts` [MODIFY] · `packages/db/schema.pg.ts` [MODIFY] · `src/lib/operations/persistence/aims-db-store.ts` [NEW] · `src/lib/__tests__/operations/persistence/aims-db-store.test.ts` [NEW] · `src/lib/__tests__/db/schema-parity.test.ts` [MODIFY] |
| **Dependencies** | AIMS-001, AIMS-004, AIMS-007, AIMS-010, AIMS-013, AIMS-014, AIMS-016 |
| **Acceptance Criteria** | 1. Schema defines all 9 AIMS tables with appropriate indexes, unique constraints, and foreign keys.<br>2. 100% column and constraint parity verified between SQLite and PostgreSQL schemas.<br>3. `AimsDbStore` provides type-safe CRUD operations with asynchronous write batching.<br>4. Database operations never block high-speed biometric matching or real-time fleet routing.<br>5. `schema-parity.test.ts` passes with zero drift. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/persistence/aims-db-store` and `schema-parity.test.ts`. |
| **Estimated Complexity** | High |

---

#### AIMS-019 — Cryptographic Merkle Audit Trail Integration for Operational Optimization Events

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-019 |
| **Phase** | Phase 7 — Persistence, Merkle Audit & OpenMetrics Telemetry |
| **Description** | Implement AIMS cryptographic audit event creators (`src/lib/operations/persistence/aims-audit-events.ts`) and integrate with `cryptoAuditWriter`. Deterministically emit immutable audit blocks into the SHA-256 Merkle chain at key operational moments: `AIMS_MARL_ACTION_DISPATCHED`, `AIMS_ENERGY_OPTIMIZED`, `AIMS_FLEET_DISPATCHED`, `AIMS_VEHICLE_MAINTENANCE_LOGGED`, `AIMS_BIOMETRIC_ATTENDANCE_VERIFIED`, `AIMS_CLOUD_RIGHTSIZED`, `AIMS_CARBON_RECORDED`, and `AIMS_RESOURCE_ALLOCATED`. |
| **Files** | `src/lib/operations/persistence/aims-audit-events.ts` [NEW] · `src/lib/security/threat-audit-events.ts` [MODIFY] · `src/lib/__tests__/operations/persistence/aims-audit-events.test.ts` [NEW] |
| **Dependencies** | AIMS-001, AIMS-006, AIMS-007, AIMS-011, AIMS-013, AIMS-014, AIMS-016 |
| **Acceptance Criteria** | 1. Every autonomous optimization, fleet dispatch, and biometric verification emits a cryptographically valid Merkle audit block.<br>2. Sensitive biometric embeddings and tenant secrets are strictly excluded/redacted before hashing.<br>3. `pnpm compliance:verify` confirms unbroken Merkle chain integrity.<br>4. Audit payloads contain timestamp, tenant ID, agent ID, operation domain, action parameters, and cryptographic signature.<br>5. Unit tests assert event creation, SHA-256 hash chains, and payload immutability. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/persistence/aims-audit-events` and `pnpm compliance:verify`. |
| **Estimated Complexity** | Medium |

---

#### AIMS-020 — Prometheus OpenMetrics Telemetry Series for Smart Campus Intelligence

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-020 |
| **Phase** | Phase 7 — Persistence, Merkle Audit & OpenMetrics Telemetry |
| **Description** | Implement AIMS telemetry metrics in `src/lib/operations/persistence/aims-metrics.ts` and register with the platform metrics registry (`src/lib/metrics/registry.ts`). Emit 8 new Prometheus OpenMetrics series: (1) `aims_energy_saved_kwh_total{campus, building}`, (2) `aims_hvac_comfort_ppd_ratio{zone}`, (3) `aims_fleet_fuel_efficiency_km_per_liter{vehicle_id}`, (4) `aims_fleet_active_dispatches{status}`, (5) `aims_biometric_verification_duration_seconds`, (6) `aims_cloud_cost_reduction_dollars_total{provider}`, (7) `aims_carbon_emissions_kg_co2e_total{scope, domain}`, and (8) `aims_marl_agent_coordination_score{domain}`. |
| **Files** | `src/lib/operations/persistence/aims-metrics.ts` [NEW] · `src/lib/metrics/registry.ts` [MODIFY] · `src/lib/__tests__/operations/persistence/aims-metrics.test.ts` [NEW] |
| **Dependencies** | AIMS-001, AIMS-006, AIMS-007, AIMS-010, AIMS-013, AIMS-014, AIMS-016 |
| **Acceptance Criteria** | 1. All 8 metric series are exported in standard Prometheus OpenMetrics text format at `/api/metrics`.<br>2. Counters, gauges, and histograms update in real time with operational events.<br>3. Calibrated histogram buckets capture sub-second biometric matches and multi-second optimization runs.<br>4. Unit tests verify metric increments, label formatting, and registry output. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/persistence/aims-metrics`. Assert Prometheus exposition format and gauge updates. |
| **Estimated Complexity** | Low-Medium |

---

### Phase 8 — Administration UI, REST APIs & Smart Campus Operations Radar

#### AIMS-021 — Admin Smart Campus & Resource Optimization REST APIs

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-021 |
| **Phase** | Phase 8 — Administration UI, REST APIs & Smart Campus Operations Radar |
| **Description** | Build administration REST API endpoints for smart campus management: (1) `GET/POST /api/admin/operations/energy/hvac` (query energy metrics, trigger setpoint optimization), (2) `GET/POST /api/admin/operations/fleet/dispatches` (query fleet status, trigger route optimization), (3) `GET/POST /api/admin/operations/biometrics/attendance` (query attendance logs, verify ZKP proof), (4) `GET/POST /api/admin/operations/cloud/cost` (query cloud spend, trigger compute rightsizing), (5) `GET /api/admin/operations/sustainability/carbon` (query carbon emissions and ESG scorecards), (6) `GET/POST /api/admin/operations/mesh/resources` (query campus assets, book shared resource), and (7) `POST /api/admin/operations/marl/override` (emergency manual override / approval gate). Enforce strict RBAC permissions. |
| **Files** | `src/app/api/admin/operations/energy/hvac/route.ts` [NEW] · `src/app/api/admin/operations/fleet/dispatches/route.ts` [NEW] · `src/app/api/admin/operations/fleet/dispatches/[id]/route.ts` [NEW] · `src/app/api/admin/operations/biometrics/attendance/route.ts` [NEW] · `src/app/api/admin/operations/cloud/cost/route.ts` [NEW] · `src/app/api/admin/operations/sustainability/carbon/route.ts` [NEW] · `src/app/api/admin/operations/mesh/resources/route.ts` [NEW] · `src/app/api/admin/operations/marl/override/route.ts` [NEW] · `src/lib/validation/aims-schemas.ts` [NEW] · `src/lib/__tests__/operations/aims-api.test.ts` [NEW] |
| **Dependencies** | AIMS-003, AIMS-006, AIMS-009, AIMS-011, AIMS-013, AIMS-015, AIMS-017, AIMS-018 |
| **Acceptance Criteria** | 1. All routes protected with `requireAuth` and granular RBAC permissions (`system:operations:view`, `system:operations:manage`, `system:energy:manage`, `system:fleet:manage`, `system:biometrics:verify`, `system:sustainability:view`).<br>2. All POST/PATCH request bodies validated with Zod schemas (`src/lib/validation/aims-schemas.ts`).<br>3. Returns structured RFC 7807 problem details on error with appropriate HTTP status codes.<br>4. Supports pagination, date range filtering, campus filtering, and full-text search.<br>5. 100% unit and integration test coverage for authorized and unauthorized access paths. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/aims-api`. Verify authentication, RBAC authorization, validation errors, and CRUD operations. |
| **Estimated Complexity** | High |

---

#### AIMS-022 — React Hooks & Client State Management for Operations Intelligence

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-022 |
| **Phase** | Phase 8 — Administration UI, REST APIs & Smart Campus Operations Radar |
| **Description** | Develop the client-side state management hooks in `src/lib/hooks/`: `use-campus-energy.ts` (HVAC setpoints, occupancy, energy savings), `use-fleet-logistics.ts` (vehicle positions, routes, dispatches, maintenance alerts), `use-biometric-attendance.ts` (real-time attendance feed, ZKP verification status), `use-cloud-sustainability.ts` (cloud costs, carbon footprint, ESG metrics), and `use-resource-mesh.ts` (campus resource catalog, reservation availability). Implement automatic polling, optimistic UI updates, and robust error recovery. |
| **Files** | `src/lib/hooks/use-campus-energy.ts` [NEW] · `src/lib/hooks/use-fleet-logistics.ts` [NEW] · `src/lib/hooks/use-biometric-attendance.ts` [NEW] · `src/lib/hooks/use-cloud-sustainability.ts` [NEW] · `src/lib/hooks/use-resource-mesh.ts` [NEW] · `src/lib/__tests__/hooks/use-campus-energy.test.ts` [NEW] · `src/lib/__tests__/hooks/use-fleet-logistics.test.ts` [NEW] · `src/lib/__tests__/hooks/use-biometric-attendance.test.ts` [NEW] · `src/lib/__tests__/hooks/use-cloud-sustainability.test.ts` [NEW] · `src/lib/__tests__/hooks/use-resource-mesh.test.ts` [NEW] |
| **Dependencies** | AIMS-021 |
| **Acceptance Criteria** | 1. Hooks encapsulate all AIMS API interactions with strongly typed response and error states.<br>2. Polling intervals adapt automatically based on operational state (3s during active vehicle transit, 15s idle).<br>3. All fetch calls include `.catch()` blocks to prevent stuck loading spinners.<br>4. Exposes intuitive mutation methods (`optimizeHvac`, `dispatchFleetRoute`, `verifyAttendanceProof`, `rightsizeCloud`, `bookResource`).<br>5. Unit tests assert state transitions, polling behavior, and error handling. |
| **Verification Method** | Run `pnpm test --testPathPattern=hooks/use-campus-energy` and `use-fleet-logistics` and `use-biometric-attendance` and `use-cloud-sustainability` and `use-resource-mesh`. |
| **Estimated Complexity** | Medium |

---

#### AIMS-023 — Admin Smart Campus Operations Intelligence Radar UI & Component Suite

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-023 |
| **Phase** | Phase 8 — Administration UI, REST APIs & Smart Campus Operations Radar |
| **Description** | Build the administrative dashboard page at `src/app/(shell)/admin/operations/smart-campus/page.tsx` and modular UI components in `src/components/operations/`: `smart-campus-radar.tsx`, `hvac-energy-optimizer-card.tsx`, `fleet-logistics-map-card.tsx`, `biometric-attendance-panel.tsx`, `cloud-cost-esg-card.tsx`, `cross-campus-resource-grid.tsx`, and `marl-agent-control-dialog.tsx`. Ensure full WCAG 2.1 AA accessibility, Radix UI primitives, responsive layouts, `<Badge>` status styling, and `<Skeleton>` loading states. |
| **Files** | `src/app/(shell)/admin/operations/smart-campus/page.tsx` [NEW] · `src/components/operations/smart-campus-radar.tsx` [NEW] · `src/components/operations/hvac-energy-optimizer-card.tsx` [NEW] · `src/components/operations/fleet-logistics-map-card.tsx` [NEW] · `src/components/operations/biometric-attendance-panel.tsx` [NEW] · `src/components/operations/cloud-cost-esg-card.tsx` [NEW] · `src/components/operations/cross-campus-resource-grid.tsx` [NEW] · `src/components/operations/marl-agent-control-dialog.tsx` [NEW] · `src/lib/__tests__/operations/aims-ui.test.tsx` [NEW] |
| **Dependencies** | AIMS-022 |
| **Acceptance Criteria** | 1. Dashboard renders 5 primary tabs: Energy & HVAC Radar, Fleet Logistics & Maintenance, Edge Biometrics, Cloud & Carbon ESG Scorecard, and Cross-Campus Resource Mesh.<br>2. Energy tab displays live temperature/occupancy charts and 1-click setpoint optimization.<br>3. Fleet tab provides interactive vehicle route visualization and maintenance warning badges.<br>4. Edge biometrics panel displays real-time attendance verification feed with zero biometric exposure.<br>5. Cloud & Carbon tab displays financial cost savings and Scope 1/2/3 carbon emission reduction gauges.<br>6. 0 WCAG accessibility violations (verified via `jest-axe`); zero raw HTML form inputs.<br>7. Component tests verify rendering across loading, empty, active data, and error states. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/aims-ui`. Verify component rendering, accessibility, tabs, and modals. |
| **Estimated Complexity** | High |

---

### Phase 9 — System Verification, Documentation & Production Runbooks

#### AIMS-024 — End-to-End AIMS Simulation Test Harness & Automated Operations CLI

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-024 |
| **Phase** | Phase 9 — System Verification, Documentation & Production Runbooks |
| **Description** | Develop a comprehensive simulation testing CLI tool (`scripts/operations/aims-simulation-runner.ts`) and end-to-end integration test suite (`src/lib/__tests__/operations/e2e-aims.test.ts`). Simulate 6 critical operational scenarios: (1) MARL agent coordination optimizing HVAC energy setpoints reducing consumption by $\ge 22\%$ with 0 comfort violations, (2) Fleet route optimization dynamically rerouting shuttles around weather hazards and saving $\ge 18\%$ fuel, (3) Predictive maintenance catching impending brake wear and auto-booking servicing, (4) Edge biometric attendance verification generating and verifying zk-SNARK attestation proof in $< 100$ms with 0 PII leakage, (5) Cloud compute rightsizing saving $\ge 32\%$ cloud spend, and (6) Cross-campus resource mesh booking facility across distributed campuses with CRDT synchronization. Add npm script `pnpm aims:simulate`. |
| **Files** | `scripts/operations/aims-simulation-runner.ts` [NEW] · `src/lib/__tests__/operations/e2e-aims.test.ts` [NEW] · `package.json` [MODIFY] |
| **Dependencies** | AIMS-001 through AIMS-023 |
| **Acceptance Criteria** | 1. `pnpm aims:simulate` executes all 6 operational simulation scenarios with 100% pass rate.<br>2. Verifies MARL action computation latency $< 10$ milliseconds and biometric verification latency $< 100$ milliseconds.<br>3. Verifies zero data leakage in generated zk-SNARK biometric proofs and ESG reporting tokens.<br>4. Confirms CRDT state merge convergence across 3 simulated campus nodes.<br>5. Emits structured JSON and terminal markdown summary report. |
| **Verification Method** | Run `pnpm test --testPathPattern=operations/e2e-aims` and execute `pnpm tsx scripts/operations/aims-simulation-runner.ts --dry-run`. |
| **Estimated Complexity** | High |

---

#### AIMS-025 — Operational Runbooks, Architecture Specifications & Governance

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-025 |
| **Phase** | Phase 9 — System Verification, Documentation & Production Runbooks |
| **Description** | Author 5 comprehensive operational engineering runbooks in `docs/`: (1) `docs/aims-marl-architecture-guide.md` (multi-agent reinforcement learning system design, reward functions, actor-critic coordination), (2) `docs/smart-campus-energy-optimization-guide.md` (BMS integration, ISO 7730 thermal comfort modeling, HVAC optimization), (3) `docs/autonomous-fleet-logistics-guide.md` (CVRPTW routing algorithms, predictive maintenance, safety guardrails), (4) `docs/edge-biometrics-privacy-guide.md` (neural embedding models, zk-SNARK attestation, offline sync), and (5) `docs/cloud-cost-carbon-esg-guide.md` (compute rightsizing, Scope 1/2/3 carbon calculations, ESG reporting). Update all AIOS governance files (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`, `.ai/execution/Sprint-043-Execution-Log.md`). |
| **Files** | `docs/aims-marl-architecture-guide.md` [NEW] · `docs/smart-campus-energy-optimization-guide.md` [NEW] · `docs/autonomous-fleet-logistics-guide.md` [NEW] · `docs/edge-biometrics-privacy-guide.md` [NEW] · `docs/cloud-cost-carbon-esg-guide.md` [NEW] · `.ai/FEATURES.md` [MODIFY] · `.ai/CHANGELOG.md` [MODIFY] · `.ai/PROJECT_STATUS.md` [MODIFY] · `.ai/execution/Sprint-043-Execution-Log.md` [NEW] |
| **Dependencies** | AIMS-024 |
| **Acceptance Criteria** | 1. All 5 runbooks authored with architecture diagrams, mathematical equations, step-by-step instructions, CLI commands, and troubleshooting FAQs.<br>2. `.ai/FEATURES.md` documents all Sprint-043 capabilities.<br>3. `.ai/CHANGELOG.md` documents v3.27.0 release notes.<br>4. `.ai/PROJECT_STATUS.md` updated with Sprint-043 progress.<br>5. `.ai/execution/Sprint-043-Execution-Log.md` initialized with all 26 tasks. |
| **Verification Method** | Inspect all 5 documents for technical completeness, formatting standards, and accurate code/configuration examples. |
| **Estimated Complexity** | Medium |

---

#### AIMS-026 — Mobile Flutter Cross-Campus Operations & Biometric Attendance Integration

| Field | Specification Details |
|---|---|
| **Task ID** | AIMS-026 |
| **Phase** | Phase 9 — System Verification, Documentation & Production Runbooks |
| **Description** | Integrate mobile client capabilities in the Flutter mobile application (`mobile/`): (1) Riverpod provider state for real-time campus shuttle tracking and route stops (`shuttle_tracking_provider.dart`), (2) Local camera neural embedding scanner integration with zero-knowledge attestation generation (`biometric_scanner_controller.dart`), and (3) Cross-campus room and resource booking screen (`campus_resource_booking_screen.dart`). Ensure full adherence to Riverpod and GoRouter conventions. |
| **Files** | `mobile/lib/features/operations/presentation/shuttle_tracking_screen.dart` [NEW] · `mobile/lib/features/operations/presentation/biometric_scanner_screen.dart` [NEW] · `mobile/lib/features/operations/presentation/campus_resource_booking_screen.dart` [NEW] · `mobile/lib/features/operations/application/operations_providers.dart` [NEW] · `mobile/test/features/operations/operations_providers_test.dart` [NEW] |
| **Dependencies** | AIMS-021, AIMS-024 |
| **Acceptance Criteria** | 1. Flutter app renders live shuttle positions on interactive campus map with pull-to-refresh.<br>2. Biometric scanner extracts embedding on-device, signs ZKP attestation token, and dispatches to `/api/admin/operations/biometrics/attendance`.<br>3. Resource booking screen allows multi-campus room reservations with optimistic UI updates.<br>4. `flutter analyze` passes with 0 errors and 0 warnings.<br>5. Flutter widget and unit tests pass with 100% success rate. |
| **Verification Method** | Run `flutter test test/features/operations/operations_providers_test.dart` and `flutter analyze`. |
| **Estimated Complexity** | High |

---

## 5. File Inventory

### New Files to Create

```
src/lib/operations/marl/
├── marl-types.ts
├── centralized-critic.ts
├── marl-engine.ts
├── agent-communication-mesh.ts
├── conflict-resolution-protocol.ts
├── operational-guardrails.ts
└── human-approval-controller.ts

src/lib/operations/energy/
├── energy-types.ts
├── bms-telemetry-ingester.ts
├── occupancy-forecaster.ts
├── thermal-comfort-model.ts
├── air-quality-model.ts
├── hvac-optimizer.ts
└── microgrid-energy-dispatcher.ts

src/lib/operations/fleet/
├── fleet-types.ts
├── fleet-telemetry-ingester.ts
├── vehicle-routing-engine.ts
├── predictive-maintenance.ts
├── vehicle-health-forecaster.ts
├── fleet-safety-enforcer.ts
└── weather-aware-dispatcher.ts

src/lib/operations/biometrics/
├── biometric-types.ts
├── neural-biometric-matcher.ts
├── edge-verification-engine.ts
├── zk-biometric-circuits.ts
├── zk-biometric-verifier.ts
├── attendance-outbox.ts
└── edge-attendance-sync.ts

src/lib/operations/cloud/
├── cloud-types.ts
├── cloud-cost-optimizer.ts
└── spot-instance-orchestrator.ts

src/lib/operations/sustainability/
├── sustainability-types.ts
├── carbon-calculator.ts
├── ghg-emissions-tracker.ts
├── carbon-reduction-planner.ts
└── esg-report-generator.ts

src/lib/operations/mesh/
├── mesh-types.ts
├── campus-resource-broker.ts
├── capacity-optimizer.ts
├── resource-crdt-sync.ts
└── distributed-reservation-scheduler.ts

src/lib/operations/persistence/
├── aims-db-store.ts
├── aims-audit-events.ts
└── aims-metrics.ts

src/lib/validation/
└── aims-schemas.ts

src/lib/hooks/
├── use-campus-energy.ts
├── use-fleet-logistics.ts
├── use-biometric-attendance.ts
├── use-cloud-sustainability.ts
└── use-resource-mesh.ts

src/app/api/admin/operations/
├── energy/
│   └── hvac/
│       └── route.ts
├── fleet/
│   └── dispatches/
│       ├── route.ts
│       └── [id]/route.ts
├── biometrics/
│   └── attendance/
│       └── route.ts
├── cloud/
│   └── cost/
│       └── route.ts
├── sustainability/
│   └── carbon/
│       └── route.ts
├── mesh/
│   └── resources/
│       └── route.ts
└── marl/
    └── override/
        └── route.ts

src/app/(shell)/admin/operations/smart-campus/
└── page.tsx

src/components/operations/
├── smart-campus-radar.tsx
├── hvac-energy-optimizer-card.tsx
├── fleet-logistics-map-card.tsx
├── biometric-attendance-panel.tsx
├── cloud-cost-esg-card.tsx
├── cross-campus-resource-grid.tsx
└── marl-agent-control-dialog.tsx

src/lib/__tests__/operations/
├── marl/
│   ├── marl-engine.test.ts
│   ├── agent-communication-mesh.test.ts
│   ├── conflict-resolution.test.ts
│   ├── operational-guardrails.test.ts
│   └── human-approval-controller.test.ts
├── energy/
│   ├── bms-telemetry-ingester.test.ts
│   ├── occupancy-forecaster.test.ts
│   ├── thermal-comfort-model.test.ts
│   ├── air-quality-model.test.ts
│   ├── hvac-optimizer.test.ts
│   └── microgrid-energy-dispatcher.test.ts
├── fleet/
│   ├── fleet-telemetry-ingester.test.ts
│   ├── vehicle-routing-engine.test.ts
│   ├── predictive-maintenance.test.ts
│   ├── vehicle-health-forecaster.test.ts
│   ├── fleet-safety-enforcer.test.ts
│   └── weather-aware-dispatcher.test.ts
├── biometrics/
│   ├── neural-biometric-matcher.test.ts
│   ├── edge-verification-engine.test.ts
│   ├── zk-biometric-verifier.test.ts
│   ├── attendance-outbox.test.ts
│   └── edge-attendance-sync.test.ts
├── cloud/
│   ├── cloud-cost-optimizer.test.ts
│   └── spot-instance-orchestrator.test.ts
├── sustainability/
│   ├── carbon-calculator.test.ts
│   ├── ghg-emissions-tracker.test.ts
│   ├── carbon-reduction-planner.test.ts
│   └── esg-report-generator.test.ts
├── mesh/
│   ├── campus-resource-broker.test.ts
│   ├── capacity-optimizer.test.ts
│   ├── resource-crdt-sync.test.ts
│   └── distributed-reservation-scheduler.test.ts
├── persistence/
│   ├── aims-db-store.test.ts
│   ├── aims-audit-events.test.ts
│   └── aims-metrics.test.ts
├── aims-api.test.ts
├── aims-ui.test.tsx
└── e2e-aims.test.ts

src/lib/__tests__/hooks/
├── use-campus-energy.test.ts
├── use-fleet-logistics.test.ts
├── use-biometric-attendance.test.ts
├── use-cloud-sustainability.test.ts
└── use-resource-mesh.test.ts

scripts/operations/
└── aims-simulation-runner.ts

docs/
├── aims-marl-architecture-guide.md
├── smart-campus-energy-optimization-guide.md
├── autonomous-fleet-logistics-guide.md
├── edge-biometrics-privacy-guide.md
└── cloud-cost-carbon-esg-guide.md

mobile/lib/features/operations/
├── presentation/
│   ├── shuttle_tracking_screen.dart
│   ├── biometric_scanner_screen.dart
│   └── campus_resource_booking_screen.dart
└── application/
    └── operations_providers.dart

mobile/test/features/operations/
└── operations_providers_test.dart

.ai/execution/
└── Sprint-043-Execution-Log.md
```

### Existing Files to Modify

```
packages/db/schema.ts                         (add aims_agents, aims_energy_telemetry, aims_energy_optimizations, aims_fleet_vehicles, aims_fleet_dispatches, aims_biometric_logs, aims_cloud_costs, aims_carbon_metrics, aims_campus_resources)
packages/db/schema.pg.ts                      (add PostgreSQL parity tables for AIMS operations)
src/lib/security/threat-audit-events.ts       (re-export AIMS audit event creators)
src/lib/metrics/registry.ts                   (register 8 new Prometheus OpenMetrics series)
package.json                                  (add aims:simulate script definition)
.ai/FEATURES.md                               (register Sprint-043 features)
.ai/CHANGELOG.md                              (document v3.27.0 release notes)
.ai/PROJECT_STATUS.md                         (update current sprint status and feature registry)
```

---

## 6. Security, RBAC & Compliance Framework

### RBAC Permissions

| Permission String | Role Access | Description |
|---|---|---|
| `system:operations:view` | `super_admin`, `admin`, `principal` | Read-only access to smart campus energy radar, fleet dispatches, carbon scorecards, and resource availability. |
| `system:operations:manage` | `super_admin`, `admin` | Full management access to trigger MARL optimizations, override agent actions, and manage cloud rightsizing. |
| `system:energy:manage` | `super_admin`, `admin`, `hod` | Adjust HVAC setpoints, configure occupancy sensor mappings, and manage building zone policies. |
| `system:fleet:manage` | `super_admin`, `admin` | Create vehicle dispatch routes, assign shuttle drivers, and manage vehicle maintenance schedules. |
| `system:biometrics:verify` | `super_admin`, `admin`, `staff` | Execute edge biometric attendance verification, verify ZKP attestation proofs, and inspect attendance logs. |
| `system:sustainability:view` | `super_admin`, `admin`, `principal` | Access carbon footprint metrics, view Scope 1/2/3 breakdown, and export certified ESG sustainability reports. |

### Compliance & Cryptographic Controls
- **Zero-Knowledge Privacy:** zk-SNARK circuits mathematically prove attendance inclusion and session validity without exposing raw face/fingerprint embeddings, photos, or student PII.
- **Hardware-Isolated Edge Matching:** Biometric matching runs entirely on-device with AES-256-GCM encrypted local storage; zero raw biometric templates are transmitted across the network.
- **Operational Safety Invariants:** MARL agent policies are strictly constrained by hard physical limits (temperature bounds, driver shift limits, minimum cloud capacity).
- **SHA-256 Merkle Chain Integrity:** All automated energy setpoints, fleet dispatch orders, biometric verifications, cloud rightsizing actions, and carbon calculations are logged as immutable blocks into the Merkle audit chain.

---

## 7. Risk Register & Mitigation Strategy

| Risk ID | Category | Risk Description | Severity | Probability | Mitigation Strategy |
|---|---|---|---|---|---|
| **R-043-1** | Comfort / Ops | Aggressive HVAC optimization causes thermal discomfort or indoor air quality degradation ($CO_2 > 1000$ ppm) | High | Medium | Enforce mathematical ISO 7730 PMV/PPD bounds ($-0.5 \le \text{PMV} \le +0.5$) and ASHRAE 62.1 fresh air ventilation floors with automated fallback. |
| **R-043-2** | MARL Oscillation | Autonomous multi-agent coordination encounters conflicting objective deadlocks or action oscillation | High | Low | Deploy Centralized Critic with VCG auction mechanisms and strict hierarchical utility weighting (Safety $>$ Comfort $>$ Efficiency $>$ Cost). |
| **R-043-3** | Safety / Fleet | Autonomous vehicle routing assigns unsafe transit paths or driver continuous duty limits are exceeded | High | Low | Implement hard-coded safety enforcers, weather-aware route penalties, speed limit clamps, and mandatory dispatcher approval for hazardous conditions. |
| **R-043-4** | Biometric Privacy | Edge biometric data exposure concerns from staff/students or regulatory auditors | Medium | Low | Deploy zero-knowledge zk-SNARK attestation proof verification where 0 plaintext embeddings or biometric images ever leave the edge device; strictly GDPR/FERPA compliant. |
| **R-043-5** | Cloud Disruption | Cloud spot instance termination during peak campus registration hours causes service interruption | Medium | Low | Maintain hybrid spot/on-demand pools with automated 2-minute pre-drain notices and pre-warmed on-demand standby instances. |
| **R-043-6** | WAN Partition | Cross-campus WAN network partition causes distributed resource double-booking | Medium | Low | Implement state-based CRDTs (ORSet & LWW-Register) with deterministic timestamp-based reservation tie-breaking. |

---

## 8. Rollback Plan

### Rollback Trigger Criteria
- HVAC optimization causes zone temperatures to drift outside $[19^\circ\text{C}, 27^\circ\text{C}]$ or $CO_2$ to exceed $1,200$ ppm for $> 10$ minutes.
- Multi-agent coordination causes CPU/memory consumption on edge or server instances to exceed $85\%$ heap.
- Spot instance orchestration triggers unhandled service downtime $> 0.1\%$.
- Biometric verification False Rejection Rate (FRR) exceeds $2.0\%$ during campus peak morning arrival.

### Rollback Execution Steps

```bash
# Step 1: Emergency Operational Kill-Switch (< 15 seconds)
# Reverts all HVAC setpoints, fleet routes, and cloud sizing to default static baselines
pnpm tsx scripts/operations/aims-simulation-runner.ts --emergency-override-all

# Step 2: Disable Autonomous Agent Optimization via Environment Flags (< 30 seconds)
AIMS_AUTONOMOUS_MARL_ENABLED=false
AIMS_HVAC_OPTIMIZATION_ENABLED=false
AIMS_SPOT_ORCHESTRATION_ENABLED=false
AIMS_EDGE_BIOMETRICS_ENABLED=true # Keep edge matching active in standard mode

# Step 3: Revert Source Code & Database Migrations (if necessary) (< 5 minutes)
git revert --no-edit HEAD
pnpm build

# Step 4: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 9. Definition of Done

A Sprint-043 task is considered **COMPLETE** when all of the following gates are met:

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
- [ ] `pnpm aims:simulate` $\to$ All 6 smart campus operational simulation scenarios pass with 100% success.

### Security & RBAC
- [ ] All new AIMS API routes protected with `requireAuth` and granular permissions (`system:operations:view`, `system:operations:manage`, `system:energy:manage`, `system:fleet:manage`, `system:biometrics:verify`, `system:sustainability:view`).
- [ ] DPoP cryptographic proof of possession validated on all admin mutation endpoints.
- [ ] zk-SNARK biometric proof verification mathematically validated with 0 plaintext data exposure.

### Documentation & Governance
- [ ] 5 operational runbooks created in `docs/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-043 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.27.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with Sprint-043 deliverables.
- [ ] `.ai/execution/Sprint-043-Execution-Log.md` initialized with all 26 tasks.

---

## 10. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-043 |
| **Sprint Name** | AI-Powered Autonomous Multi-Agent Cross-Campus Resource Optimization & Smart Campus Intelligence (AIMS / AutoOps) |
| **Target Release Version** | v3.27.0 |
| **Total Implementation Tasks** | 26 (AIMS-001 through AIMS-026) |
| **Estimated Sprint Duration** | 16–18 engineering days |
| **Estimated Complexity** | Large |
| **Predecessor Sprint** | SPRINT-042 (v3.26.0 — Autonomous Resilience & Predictive Security Engine — ARES) |
| **Successor Artifact** | `.ai/execution/Sprint-043-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-043.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-20*  
*ThaibaHive Institution OS — Sprint-043 v3.27.0 Engineering Lifecycle*
