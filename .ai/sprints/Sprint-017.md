# Implementation Contract: Sprint-017 Global Education Intelligence & Real-Time Multi-Region Mesh

**Sprint ID:** GLOBAL-EDUCATION-INTELLIGENCE-MESH-017 (GEI-MESH-017)  
**Sprint Name:** Global Education Intelligence & Real-Time Multi-Region Mesh  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-08-03  
**Target Execution:** 2026-08-04 to 2026-09-29  
**Estimated Duration:** 6–8 weeks (240–320 engineering hours)  
**Risk Level:** High (Multi-region replication, low-latency streaming, ML model deployment, database failover)  
**Classification:** AIOS v3.1 Official Implementation Contract  
**Target Release Version:** v3.1.0 (Multi-Region Data Mesh, Predictive Student Learning Analytics, Live WebRTC/HLS Streaming, PostgreSQL Cluster Certification & Failover)

---

## Executive Summary

Sprint-017 executes **Global Education Intelligence & Real-Time Multi-Region Mesh**, strategically advancing ThaibaHive from v3.0.0 into **v3.1.0**. Following the successful completion of Sprint-016—which established enterprise multi-tenant scale, regional data lakehouse integration (Parquet/Arrow exports), SAML 2.0/OIDC identity federation, automated database index tuning, and enterprise MDM distribution certification across 166 passing test suites (678/678 tests passing)—all core ERP modules, analytical pipelines, and mobile companion capabilities are fully operational.

This landmark sprint transitions ThaibaHive from a regional multi-tenant platform into a **globally distributed, intelligent learning operating system**. It arms global educational institutions, multi-national school networks, and distance learning universities with sub-second cross-region data synchronization, AI-powered predictive student success analytics, low-latency live distance learning streaming, and zero-downtime PostgreSQL database cluster failover.

### Key Business Impact

- **Sub-Second Cross-Region Data Locality (<5s Sync SLA):** Multi-Region Data Mesh with Conflict-Free Replicated Data Types (CRDTs) and vector clocks (`replication-engine.ts`, `crdt-resolver.ts`), serving multi-campus networks across continents with low query latency while eliminating expensive cross-region database lock contention.
- **15–20% Improvement in Student Retention:** Predictive Learning Analytics Engine (`feature-extractor.ts`, `prediction-engine.ts`) leveraging machine learning inference to identify at-risk students 4–6 weeks prior to examination periods and generate automated personalized learning paths.
- **Global Low-Latency Distance Learning (<500ms Video SLA):** Integrated WebRTC SFU signaling and HLS live streaming engine (`webrtc-signaling.ts`, `hls-segmenter.ts`) powering hybrid classrooms with real-time interactive collaboration, low-latency audio/video broadcasting, and recording archiving.
- **High-Availability Database Infrastructure (<30s Failover SLA):** PostgreSQL Multi-Node Cluster Certification with streaming replication health monitoring and automated failover orchestration (`cluster-monitor.ts`, `failover-manager.ts`), reducing unplanned database downtime from hours to under 30 seconds with zero data loss.
- **30–40% Reduction in Egress Costs:** Intelligent Global Query Router (`query-router.ts`) directing read requests to nearest geographic database replicas while utilizing federated Redis caching for high-concurrency read operations.

### Strategic Alignment

- Advances product version from v3.0.0 to **v3.1.0 (Global Education Intelligence & Real-Time Multi-Region Mesh)**.
- Builds directly upon Sprint-016 Data Lakehouse and Identity Federation primitives to enable global scale.
- Fulfills global market expansion requirements for multi-national educational bodies and online universities.
- Enforces strict multi-tenant isolation, cross-region data residency controls (GDPR compliance), and Zero Trust security boundaries across all distributed nodes.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation

The Sprint-017 specification is **technically sound, architecturally incremental, and fully compliant with AIOS v3.1 standards**. The implementation builds directly upon established platform primitives:
- **Multi-Region Data Mesh:** Uses Conflict-Free Replicated Data Types (LWW-Element-Set CRDTs) and vector clock metadata (`vector-clock.ts`) to manage asynchronous cross-region state replication over HTTP/2 event buses without requiring synchronous two-phase commit locks across WAN links.
- **Predictive Analytics Pipeline:** Uses a lightweight feature extraction engine (`feature-extractor.ts`) reading student attendance, assessment trends, LMS activity, and fee payment timelines to execute real-time statistical inference (`prediction-engine.ts`) with sub-100ms API response latency.
- **WebRTC/HLS Streaming Engine:** Leverages WebRTC SDP offer/answer signaling over WebSockets (`webrtc-signaling.ts`) alongside segmented HLS stream packaging (`hls-segmenter.ts`) for adaptive bitrate live classroom broadcasting.
- **PostgreSQL Cluster Failover:** Extends Drizzle ORM connection pools with dynamic primary/replica node selectors (`replica-pool.ts`), continuously parsing `pg_stat_replication` and executing automated master promotion scripts via Patroni/pg_auto_failover semantics (`failover-manager.ts`).

### Technical Assessment & Risks Identified

1. **Cross-Region Asynchronous Replication Conflict & Data Divergence**
   - *Challenge:* Simultaneous concurrent updates to student records in different regions can cause data inconsistency during network partitions.
   - *Mitigation:* Implement Last-Write-Wins (LWW) CRDT semantics tied to monotonic vector clocks (`GEI-001`, `GEI-003`) alongside automated conflict log audit tables for manual administrator overrides.

2. **WebRTC Media Server Relay & NAT Traversal Latency in Low-Bandwidth Regions**
   - *Challenge:* Direct P2P WebRTC connections may fail under strict institutional firewalls or NAT environments, causing stream fallback delays.
   - *Mitigation:* Integrate fallback STUN/TURN candidate orchestration and automatic low-bitrate HLS live stream fallback (`GEI-011`, `GEI-012`, `GEI-013`).

3. **Predictive Analytics Model Drift & Inference Latency Overhead**
   - *Challenge:* Evaluating multi-variate ML feature matrices during live API calls could introduce performance bottlenecks.
   - *Mitigation:* Decouple feature vector computation into background workers and cache pre-computed risk scores in Redis with sub-100ms lookup latencies (`GEI-006`, `GEI-008`).

4. **Split-Brain Conditions During Automated PostgreSQL Cluster Failover**
   - *Challenge:* Unintended network isolation might lead two database nodes to act as primary simultaneously, causing data corruption.
   - *Mitigation:* Enforce odd-numbered quorum consensus (3+ nodes) for failover triggers, PostgreSQL `synchronous_commit = remote_write`, and stonith/fencing rules before node promotion (`GEI-015`, `GEI-016`).

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule** documented in `AGENTS.md`, this implementation contract was submitted for multi-model technical review to **Qwen**, **OpenCode (Local-Ollama)**, and **Claude Code**. The following architectural enhancements were incorporated into the task specifications:

1. **Federated Redis Caching & Read-Replica Selection (OpenCode / Local-Ollama):** Recommended integrating region-aware Redis caching and dynamic read-replica health routing in `query-router.ts` (`GEI-002`) to optimize data access locality and reduce WAN egress costs by up to 40%.
2. **Vector Clock Partition Keys for Multi-Region Replicas (Qwen):** Recommended attaching immutable vector clock headers and tenant partition keys (`GEI-001`, `GEI-003`) to cross-region sync payload queues to guarantee causality preservation during network reconnects.
3. **Adaptive Bitrate HLS Stream Fallback for Hybrid Classrooms (Claude Code):** Recommended coupling WebRTC peer sessions with chunked HLS stream generators (`GEI-011`, `GEI-012`) to support fallback viewing for high-concurrency passive participants (1,000+ viewers) while keeping WebRTC for active interactive speakers (<50ms audio/video).
4. **PostgreSQL Quorum Fencing & Pre-Promotion Validation (Claude Code & OpenCode):** Suggested implementing strict node fencing checks and replication lag threshold validation (`<10MB` / `<2s`) in `failover-manager.ts` (`GEI-015`, `GEI-016`) before executing automated primary promotion.

---

## Scope & Out of Scope

### In Scope

1. **Multi-Region Data Mesh & Global Query Routing:**
   - Asynchronous cross-region replication engine (`src/lib/mesh/replication-engine.ts`) with LWW-CRDT conflict resolution (`src/lib/mesh/crdt-resolver.ts`).
   - Global query routing layer (`src/lib/mesh/query-router.ts`) with regional health monitoring and read-replica selection (`src/lib/mesh/region-health.ts`).
   - Vector clock synchronization manager (`src/lib/mesh/vector-clock.ts`) and persistent payload sync queue (`src/lib/mesh/sync-queue.ts`).
   - Database tracking schema (`mesh_nodes`, `replication_logs`, `conflict_events`) in `packages/db`.
   - Admin API route handlers (`/api/admin/mesh/replication/status`, `/api/admin/mesh/replication/trigger`, `/api/admin/mesh/regions/health`).

2. **Predictive Student Learning Analytics & Inference Engine:**
   - Multi-variate student interaction and academic feature extractor (`src/lib/analytics/feature-extractor.ts`).
   - Predictive student success scoring & learning path recommendation engine (`src/lib/analytics/prediction-engine.ts`, `src/lib/analytics/learning-path-recommender.ts`).
   - Real-time prediction inference API & alert dispatcher (`src/lib/analytics/inference-service.ts`).
   - Student risk assessment & prediction API route handlers (`/api/analytics/predictions/student/[id]`, `/api/analytics/predictions/at-risk`, `/api/admin/analytics/models/status`).
   - Database tracking schema (`predictive_models`, `student_risk_scores`, `learning_path_recommendations`) in `packages/db`.

3. **Low-Latency WebRTC & HLS Hybrid Distance Learning Engine:**
   - WebRTC signaling protocol & SFU session manager (`src/lib/streaming/webrtc-signaling.ts`, `src/lib/streaming/media-session.ts`).
   - Low-latency HLS manifest generator & live stream segmenter (`src/lib/streaming/hls-segmenter.ts`, `src/lib/streaming/stream-recorder.ts`).
   - Real-time hybrid classroom collaboration bridge (`src/lib/streaming/collaboration-bridge.ts`).
   - Live distance learning API route handlers (`/api/streaming/rooms/[id]/signal`, `/api/streaming/streams/[id]/hls`, `/api/streaming/rooms/[id]/participants`).
   - Database tracking schema (`streaming_rooms`, `streaming_sessions`, `stream_recordings`) in `packages/db`.

4. **PostgreSQL Multi-Node Cluster Certification & Zero-Downtime Migration:**
   - PostgreSQL cluster node health monitor & replication lag analyzer (`src/lib/database/cluster-monitor.ts`).
   - Dynamic primary/read-replica connection pool routing manager (`src/lib/database/replica-pool.ts`).
   - Automated cluster failover orchestrator (`src/lib/database/failover-manager.ts`) and live migration engine (`src/lib/database/live-migrator.ts`).
   - Cluster health & migration API route handlers (`/api/admin/database/cluster/health`, `/api/admin/database/cluster/failover`, `/api/admin/database/migration/status`).
   - Database tracking schema (`cluster_nodes`, `failover_events`, `migration_jobs`) in `packages/db`.

5. **Integration, Testing, Security Audit & Release Documentation:**
   - Comprehensive test suites (`multi-region-mesh.test.ts`, `predictive-analytics.test.ts`, `streaming-integration.test.ts`, `postgres-failover.test.ts`, `sprint-017-performance.test.ts`, `sprint-017-security-audit.test.ts`).
   - Architecture Guide (`docs/global-education-intelligence-guide.md`).
   - Full update of AIOS documentation (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`).

### Explicitly Out of Scope

- Provisioning physical cloud infrastructure across multi-region datacenters (testing will utilize local node simulations, containerized mock endpoints, and environment flag region configurations).
- Procurement of commercial WebRTC SFU SaaS subscriptions or external TURN server vendor accounts (system will feature embedded signaling and STUN/TURN configuration abstractions).
- Training custom deep-learning neural network weights from scratch (inference will use deterministic statistical ML scoring matrices and configurable feature weights).
- Modifying non-education core ERP logic outside of replication, analytics, streaming, and database failover.

---

## Detailed Task Breakdown

### Phase 1: Multi-Region Data Mesh Replication & Global Query Routing

#### Task GEI-001: Asynchronous Cross-Region Replication Engine & CRDT Conflict Resolver
- **Task ID:** GEI-001
- **Description:** Implement the core cross-region data replication engine (`src/lib/mesh/replication-engine.ts`) and Last-Write-Wins CRDT conflict resolver (`src/lib/mesh/crdt-resolver.ts`). Build asynchronous payload serialization, delta change capture mechanisms, timestamp comparison logic, and deterministic field-level merging for cross-region data sync.
- **Files:**
  - `src/lib/mesh/replication-engine.ts` [NEW]
  - `src/lib/mesh/crdt-resolver.ts` [NEW]
  - `src/lib/mesh/types.ts` [NEW]
- **Dependencies:** None (foundational task for Phase 1)
- **Acceptance Criteria:**
  - `replication-engine.ts` serializes entity mutations into standardized cross-region delta payloads.
  - `crdt-resolver.ts` accurately resolves concurrent update conflicts using LWW-CRDT rules with monotonic physical/logical timestamps.
  - Prevents data loss during out-of-order delta arrival by maintaining entity version history.
  - Supports batch payload processing with configurable chunk size (default: 500 mutations/batch).
- **Verification Method:** Run `npx jest src/lib/__tests__/crdt-resolver.test.ts` verifying deterministic conflict resolution across concurrent mock regional updates.
- **Estimated Complexity:** High

#### Task GEI-002: Global Dynamic Query Router & Regional Health Selector
- **Task ID:** GEI-002
- **Description:** Implement the intelligent global query router (`src/lib/mesh/query-router.ts`) and regional health selector (`src/lib/mesh/region-health.ts`). Dynamically route database read queries to the geographically closest operational region, monitor cross-region latency metrics, and automatically reroute traffic during regional network degradation.
- **Files:**
  - `src/lib/mesh/query-router.ts` [NEW]
  - `src/lib/mesh/region-health.ts` [NEW]
- **Dependencies:** GEI-001
- **Acceptance Criteria:**
  - `query-router.ts` routes incoming queries based on regional tenant configuration and proximity metrics.
  - `region-health.ts` executes background health pings (ping frequency: 5s, timeout threshold: 2s) to track regional node availability.
  - Automatically isolates unhealthy regional nodes and redirects read queries to secondary operational replicas within <3 seconds.
  - Integrates with Redis cache layer for high-frequency read optimization.
- **Verification Method:** Run unit tests simulating regional node outages and verifying automatic query rerouting.
- **Estimated Complexity:** Medium-High

#### Task GEI-003: Cross-Region Vector Clock Sync Queue & Event Bus
- **Task ID:** GEI-003
- **Description:** Implement vector clock synchronization tracking (`src/lib/mesh/vector-clock.ts`) and persistent event bus queue (`src/lib/mesh/sync-queue.ts`). Track causality sequences across multi-region nodes, manage event delivery retry backoffs, and prevent message duplication during network reconnects.
- **Files:**
  - `src/lib/mesh/vector-clock.ts` [NEW]
  - `src/lib/mesh/sync-queue.ts` [NEW]
- **Dependencies:** GEI-001, GEI-002
- **Acceptance Criteria:**
  - `vector-clock.ts` increments and compares vector clock states across all participating region nodes.
  - `sync-queue.ts` provides persistent queueing for un-acknowledged replication events with exponential backoff retries (max retries: 5).
  - Guarantees idempotent message processing across nodes using event idempotency IDs.
- **Verification Method:** Unit test vector clock ordering logic and retry queue behavior under network failure conditions.
- **Estimated Complexity:** Medium-High

#### Task GEI-004: Multi-Region Mesh Database Tracking Schema & Admin API Routes
- **Task ID:** GEI-004
- **Description:** Define Drizzle ORM database schemas for multi-region mesh tracking in `packages/db` and implement administrative API route handlers (`/api/admin/mesh/replication/status`, `/api/admin/mesh/replication/trigger`, `/api/admin/mesh/regions/health`).
- **Files:**
  - `packages/db/src/schema/mesh.ts` [NEW — tables: `mesh_nodes`, `replication_logs`, `conflict_events`]
  - `packages/db/src/index.ts` [MODIFY — export mesh schema]
  - `src/db/schema.ts` [MODIFY — re-export mesh schema]
  - `src/app/api/admin/mesh/replication/status/route.ts` [NEW]
  - `src/app/api/admin/mesh/replication/trigger/route.ts` [NEW]
  - `src/app/api/admin/mesh/regions/health/route.ts` [NEW]
- **Dependencies:** GEI-001, GEI-002, GEI-003
- **Acceptance Criteria:**
  - Drizzle tables `mesh_nodes`, `replication_logs`, and `conflict_events` created with proper indexes and foreign keys.
  - All admin API routes protected with `requireAuth(handler, "mesh:admin")` permission wrapper.
  - GET `/status` returns real-time replication lag, queue depth, and conflict metrics per region.
  - POST `/trigger` manually initiates an on-demand cross-region sync job.
- **Verification Method:** Execute HTTP API integration tests verifying 200 responses, RBAC permission rejection, and DB persistence.
- **Estimated Complexity:** Medium

#### Task GEI-005: Multi-Region Data Mesh Integration & Consistency Test Suite
- **Task ID:** GEI-005
- **Description:** Author comprehensive integration test suite (`src/lib/__tests__/multi-region-mesh.test.ts`) validating cross-region data replication, CRDT conflict resolution, vector clock ordering, and query router failover.
- **Files:**
  - `src/lib/__tests__/multi-region-mesh.test.ts` [NEW]
- **Dependencies:** GEI-001 through GEI-004
- **Acceptance Criteria:**
  - Test suite passes with 100% assertion success.
  - Confirms cross-region replication achieves sub-5s consistency SLA across simulated multi-node topology.
  - Validates tenant boundary isolation across regional data stores.
- **Verification Method:** Run `npx jest src/lib/__tests__/multi-region-mesh.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 2: Predictive Student Learning Analytics & Real-Time Inference

#### Task GEI-006: Student Academic Interaction & Behavioural Feature Extractor
- **Task ID:** GEI-006
- **Description:** Implement the multi-variate feature extraction pipeline (`src/lib/analytics/feature-extractor.ts`). Extract student performance indicators (attendance rates, assignment scores, exam score trends, LMS interaction frequency, fee payment status) into normalized numerical feature vectors for predictive analysis.
- **Files:**
  - `src/lib/analytics/feature-extractor.ts` [NEW]
  - `src/lib/analytics/types.ts` [NEW]
- **Dependencies:** None (foundational task for Phase 2)
- **Acceptance Criteria:**
  - `feature-extractor.ts` computes composite risk feature matrices for individual students or full course cohorts.
  - Handles missing data points gracefully with configurable default imputation strategies.
  - Formats feature vectors into standardized structure compatible with prediction models.
  - Supports incremental feature updates based on newly ingested academic events.
- **Verification Method:** Execute unit tests checking feature matrix generation against sample student dataset records.
- **Estimated Complexity:** Medium-High

#### Task GEI-007: AI-Powered Student Success Prediction & Learning Path Recommender Engine
- **Task ID:** GEI-007
- **Description:** Create the prediction engine (`src/lib/analytics/prediction-engine.ts`) and personalized learning path recommender (`src/lib/analytics/learning-path-recommender.ts`). Evaluate feature vectors against weighted risk classification algorithms, compute student drop-out / failure risk scores (0–100%), and generate tailored academic intervention plans.
- **Files:**
  - `src/lib/analytics/prediction-engine.ts` [NEW]
  - `src/lib/analytics/learning-path-recommender.ts` [NEW]
- **Dependencies:** GEI-006
- **Acceptance Criteria:**
  - `prediction-engine.ts` categorizes student risk levels into High, Medium, Low with confidence scores.
  - Achieves ≥80% prediction accuracy on standard validation test datasets.
  - `learning-path-recommender.ts` generates specific remediation recommendations (e.g. tutoring modules, supplementary study materials, counselor check-ins).
  - Operates deterministically without external neural network runtime overhead.
- **Verification Method:** Unit test prediction scoring against benchmark student profile scenarios.
- **Estimated Complexity:** High

#### Task GEI-008: Real-Time Inference API Router & Automated At-Risk Alert Dispatcher
- **Task ID:** GEI-008
- **Description:** Implement the real-time inference service wrapper (`src/lib/analytics/inference-service.ts`) and API route handlers (`/api/analytics/predictions/student/[id]`, `/api/analytics/predictions/at-risk`, `/api/admin/analytics/models/status`). Dispatch automated alert notifications to teachers and academic advisors when high-risk student thresholds are breached.
- **Files:**
  - `src/lib/analytics/inference-service.ts` [NEW]
  - `src/app/api/analytics/predictions/student/[id]/route.ts` [NEW]
  - `src/app/api/analytics/predictions/at-risk/route.ts` [NEW]
  - `src/app/api/admin/analytics/models/status/route.ts` [NEW]
- **Dependencies:** GEI-006, GEI-007
- **Acceptance Criteria:**
  - Prediction API returns student risk scores and recommendations with <100ms response latency at p95.
  - Protected with `requireAuth(handler, "analytics:read")` / `"analytics:manage"`.
  - `/api/analytics/predictions/at-risk` returns paginated list of at-risk students filtered by institution/department.
  - Triggers push/email alert dispatches when a student transitions into High Risk status.
- **Verification Method:** Execute HTTP route integration tests asserting sub-100ms response times and notification triggers.
- **Estimated Complexity:** Medium

#### Task GEI-009: Predictive Analytics Database Tracking Schema & Model Registry
- **Task ID:** GEI-009
- **Description:** Add Drizzle ORM schema definitions for predictive analytics tracking in `packages/db` (`predictive_models`, `student_risk_scores`, `learning_path_recommendations`).
- **Files:**
  - `packages/db/src/schema/predictive-analytics.ts` [NEW]
  - `packages/db/src/index.ts` [MODIFY — export analytics schema]
  - `src/db/schema.ts` [MODIFY — re-export analytics schema]
- **Dependencies:** GEI-007, GEI-008
- **Acceptance Criteria:**
  - Schema tables defined with proper indexes on `student_id`, `institution_id`, `risk_level`, and `created_at`.
  - Maintains historical log of risk score trajectory over time for longitudinal trend analysis.
- **Verification Method:** Inspect DB migration script generation and verify schema definitions in `packages/db`.
- **Estimated Complexity:** Medium

#### Task GEI-010: Predictive Learning Analytics Verification & Model Precision Test Suite
- **Task ID:** GEI-010
- **Description:** Author comprehensive verification test suite (`src/lib/__tests__/predictive-analytics.test.ts`) testing feature extraction completeness, score calculation accuracy, inference latency, and recommendation generation.
- **Files:**
  - `src/lib/__tests__/predictive-analytics.test.ts` [NEW]
- **Dependencies:** GEI-006 through GEI-009
- **Acceptance Criteria:**
  - Test suite passes with 100% assertion success.
  - Confirms inference calculations meet the <100ms p95 latency requirement.
  - Verifies multi-tenant data isolation during predictive scoring.
- **Verification Method:** Run `npx jest src/lib/__tests__/predictive-analytics.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 3: Low-Latency WebRTC & HLS Hybrid Distance Learning Engine

#### Task GEI-011: WebRTC Signaling Protocol & SFU Peer Session Coordinator
- **Task ID:** GEI-011
- **Description:** Implement the WebRTC signaling engine (`src/lib/streaming/webrtc-signaling.ts`) and peer session coordinator (`src/lib/streaming/media-session.ts`). Manage SDP offer/answer exchange, ICE candidate collection, peer mesh/SFU room join flows, and media track publishing (audio, video, screen share).
- **Files:**
  - `src/lib/streaming/webrtc-signaling.ts` [NEW]
  - `src/lib/streaming/media-session.ts` [NEW]
  - `src/lib/streaming/types.ts` [NEW]
- **Dependencies:** None (foundational task for Phase 3)
- **Acceptance Criteria:**
  - `webrtc-signaling.ts` handles full SDP handshake and ICE candidate exchange over WebSocket / HTTP SSE connections.
  - `media-session.ts` manages active participant session states, track mutations (mute/unmute, video enable/disable), and room capacity limits.
  - Achieves <500ms peer connection setup latency.
  - Supports STUN/TURN server configuration headers.
- **Verification Method:** Run unit tests asserting SDP state machine transitions and ICE candidate exchange handling.
- **Estimated Complexity:** High

#### Task GEI-012: Low-Latency HLS Stream Segmenter & Live Recording Archiver
- **Task ID:** GEI-012
- **Description:** Implement the HLS stream segmenter (`src/lib/streaming/hls-segmenter.ts`) and live stream recorder (`src/lib/streaming/stream-recorder.ts`). Convert live hybrid classroom media feeds into low-latency HLS playlist manifests (`.m3u8`) and media segment chunks (`.ts` / `.m4s`), enabling large-scale broadcast viewing and automatic VOD recording archiving.
- **Files:**
  - `src/lib/streaming/hls-segmenter.ts` [NEW]
  - `src/lib/streaming/stream-recorder.ts` [NEW]
- **Dependencies:** GEI-011
- **Acceptance Criteria:**
  - `hls-segmenter.ts` generates valid HLS v6 master and variant playlist manifests with sliding window chunking.
  - `stream-recorder.ts` archives completed stream sessions into storage-ready media bundles with metadata.
  - Supports adaptive bitrate selection (1080p, 720p, 480p, 360p).
- **Verification Method:** Execute unit tests validating `.m3u8` manifest syntax and HLS segment generation.
- **Estimated Complexity:** Medium-High

#### Task GEI-013: Hybrid Classroom Real-Time Collaboration Bridge & Streaming API Routes
- **Task ID:** GEI-013
- **Description:** Create the real-time classroom collaboration bridge (`src/lib/streaming/collaboration-bridge.ts`) and API route handlers (`/api/streaming/rooms/[id]/signal`, `/api/streaming/streams/[id]/hls`, `/api/streaming/rooms/[id]/participants`). Support live polling, shared whiteboard state sync, chat messaging, and breakout room assignments.
- **Files:**
  - `src/lib/streaming/collaboration-bridge.ts` [NEW]
  - `src/app/api/streaming/rooms/[id]/signal/route.ts` [NEW]
  - `src/app/api/streaming/streams/[id]/hls/route.ts` [NEW]
  - `src/app/api/streaming/rooms/[id]/participants/route.ts` [NEW]
  - `packages/db/src/schema/streaming.ts` [NEW — tables: `streaming_rooms`, `streaming_sessions`, `stream_recordings`]
  - `packages/db/src/index.ts` [MODIFY — export streaming schema]
  - `src/db/schema.ts` [MODIFY — re-export streaming schema]
- **Dependencies:** GEI-011, GEI-012
- **Acceptance Criteria:**
  - Endpoints protected with `requireAuth(handler, "streaming:access")`.
  - `/api/streaming/rooms/[id]/signal` processes WebRTC signaling messages and broadcasts state updates to room peers.
  - `/api/streaming/streams/[id]/hls` serves live HLS manifests with low latency.
  - `collaboration-bridge.ts` synchronizes whiteboard draw actions and live poll responses across participants.
- **Verification Method:** HTTP route integration tests validating signaling handshake, HLS manifest response headers, and session tracking.
- **Estimated Complexity:** Medium-High

#### Task GEI-014: Distance Learning Streaming & WebRTC Latency Verification Test Suite
- **Task ID:** GEI-014
- **Description:** Author comprehensive verification test suite (`src/lib/__tests__/streaming-integration.test.ts`) testing WebRTC signaling flows, HLS playlist generation, media session teardown, and sub-500ms latency SLAs.
- **Files:**
  - `src/lib/__tests__/streaming-integration.test.ts` [NEW]
- **Dependencies:** GEI-011, GEI-012, GEI-013
- **Acceptance Criteria:**
  - Test suite passes with 100% assertion success.
  - Confirms WebRTC signaling completes in <500ms under simulated network conditions.
  - Verifies multi-tenant room isolation so participants cannot intercept streams from other institutions.
- **Verification Method:** Run `npx jest src/lib/__tests__/streaming-integration.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 4: PostgreSQL Multi-Node Cluster Certification & Zero-Downtime Migration

#### Task GEI-015: PostgreSQL Multi-Node Cluster Health & Replication Monitor
- **Task ID:** GEI-015
- **Description:** Implement the database cluster monitor (`src/lib/database/cluster-monitor.ts`) and dynamic replica connection pool selector (`src/lib/database/replica-pool.ts`). Query PostgreSQL replication status system views (`pg_stat_replication`, `pg_stat_wal_receiver`), track WAL byte lag, and route read transactions to healthiest available replicas.
- **Files:**
  - `src/lib/database/cluster-monitor.ts` [NEW]
  - `src/lib/database/replica-pool.ts` [NEW]
  - `src/lib/database/types.ts` [NEW]
- **Dependencies:** None (foundational task for Phase 4)
- **Acceptance Criteria:**
  - `cluster-monitor.ts` polls node cluster states (primary, standby, read replica) and extracts replication lag in bytes and milliseconds.
  - `replica-pool.ts` dynamically balances read query load across active replicas, removing nodes exceeding lag thresholds (>10MB or >2s lag).
  - Provides real-time cluster topology health status object.
- **Verification Method:** Unit test cluster monitoring logic against simulated `pg_stat_replication` stat responses.
- **Estimated Complexity:** Medium-High

#### Task GEI-016: Automated Database Cluster Failover Manager & Zero-Downtime Live Migrator
- **Task ID:** GEI-016
- **Description:** Create the cluster failover orchestrator (`src/lib/database/failover-manager.ts`) and live migration tool (`src/lib/database/live-migrator.ts`). Execute automatic primary node promotion upon master failure (<30s recovery SLA), reconfigure pool connections, perform dual-write schema migrations, and execute automated rollback procedures if migration checks fail.
- **Files:**
  - `src/lib/database/failover-manager.ts` [NEW]
  - `src/lib/database/live-migrator.ts` [NEW]
  - `packages/db/src/schema/cluster.ts` [NEW — tables: `cluster_nodes`, `failover_events`, `migration_jobs`]
  - `packages/db/src/index.ts` [MODIFY — export cluster schema]
  - `src/db/schema.ts` [MODIFY — re-export cluster schema]
  - `src/app/api/admin/database/cluster/health/route.ts` [NEW]
  - `src/app/api/admin/database/cluster/failover/route.ts` [NEW]
  - `src/app/api/admin/database/migration/status/route.ts` [NEW]
- **Dependencies:** GEI-015
- **Acceptance Criteria:**
  - `failover-manager.ts` detects primary database failure, enforces quorum fencing, promotes standby node to primary, and updates pool connection parameters in <30 seconds.
  - `live-migrator.ts` executes zero-downtime schema migrations using shadow table strategies and dual-write phases.
  - Admin endpoints (`/api/admin/database/cluster/*`) protected by `requireAuth(handler, "database:admin")`.
  - Maintains complete audit trail of failover events and migration executions in `failover_events` and `migration_jobs`.
- **Verification Method:** Integration test simulating primary DB outage and asserting automatic failover promotion within <30 seconds.
- **Estimated Complexity:** High

#### Task GEI-017: PostgreSQL Cluster Failover & Zero-Downtime Migration Verification Test Suite
- **Task ID:** GEI-017
- **Description:** Author safety and failover test suite (`src/lib/__tests__/postgres-failover.test.ts`) testing failover promotion speed, connection pool switching, live migration rollback safety, and split-brain prevention.
- **Files:**
  - `src/lib/__tests__/postgres-failover.test.ts` [NEW]
- **Dependencies:** GEI-015, GEI-016
- **Acceptance Criteria:**
  - Test suite passes with 100% assertion success.
  - Confirms failover completes in <30 seconds with zero data loss on synchronous standby.
  - Validates live migration rollback restores original schema cleanly on assertion failure.
- **Verification Method:** Run `npx jest src/lib/__tests__/postgres-failover.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 5: E2E Integration, Benchmarks, Security Audits, and Release Certification

#### Task GEI-018: Multi-Region Performance & WebRTC Latency Benchmark Test Suite
- **Task ID:** GEI-018
- **Description:** Author performance benchmark test suite (`src/lib/__tests__/sprint-017-performance.test.ts`) validating cross-region replication latency (<5s), predictive analytics inference latency (<100ms p95), WebRTC connection setup latency (<500ms), and DB cluster failover recovery time (<30s).
- **Files:**
  - `src/lib/__tests__/sprint-017-performance.test.ts` [NEW]
- **Dependencies:** GEI-005, GEI-010, GEI-014, GEI-017
- **Acceptance Criteria:**
  - All performance assertions pass under simulated multi-tenant workload load.
  - Cross-region replication sync latency <5 seconds for 99.9% of events.
  - Student risk prediction API response time <100ms p95.
  - WebRTC signaling setup <500ms.
- **Verification Method:** Run `npx jest src/lib/__tests__/sprint-017-performance.test.ts`.
- **Estimated Complexity:** Medium

#### Task GEI-019: Cross-Region Security Invariants & Multi-Tenant Audit Test Suite
- **Task ID:** GEI-019
- **Description:** Author comprehensive security audit test suite (`src/lib/__tests__/sprint-017-security-audit.test.ts`) enforcing zero cross-tenant data leakage across multi-region replication streams, WebRTC streaming rooms, predictive analytics data models, and database failover tasks.
- **Files:**
  - `src/lib/__tests__/sprint-017-security-audit.test.ts` [NEW]
- **Dependencies:** GEI-005, GEI-010, GEI-014, GEI-017
- **Acceptance Criteria:**
  - 100% security invariants verified across all new Sprint-017 domains.
  - Confirms tenant A cannot inspect or subscribe to tenant B replication event queues or WebRTC streaming rooms.
  - Confirms predictive analytics feature extraction respects institution data isolation boundaries.
- **Verification Method:** Run `npx jest src/lib/__tests__/sprint-017-security-audit.test.ts`.
- **Estimated Complexity:** Medium-High

#### Task GEI-020: Architecture Guide & Sprint-017 Release Certification Documentation
- **Task ID:** GEI-020
- **Description:** Author comprehensive architecture guide (`docs/global-education-intelligence-guide.md`) detailing Multi-Region Mesh setup, Predictive Analytics integration, Low-Latency WebRTC/HLS Streaming runbooks, and PostgreSQL Cluster Failover operations. Update AIOS documentation (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`).
- **Files:**
  - `docs/global-education-intelligence-guide.md` [NEW]
  - `.ai/FEATURES.md` [MODIFY — register Sprint-017 features]
  - `.ai/CHANGELOG.md` [MODIFY — log v3.1.0 release candidate changes]
  - `.ai/PROJECT_STATUS.md` [MODIFY — update sprint completion status]
- **Dependencies:** GEI-001 through GEI-019
- **Acceptance Criteria:**
  - Comprehensive guide published covering architecture, setup, troubleshooting, and failover runbooks.
  - `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` fully updated.
  - Build passes clean (`npx tsc --noEmit` 0 errors, ESLint clean).
- **Verification Method:** Inspect generated documentation files and verify clean build status.
- **Estimated Complexity:** Medium

---

## Task Summary Table

| Task ID | Component / Area | Dependencies | Est. Complexity | Target Deliverable |
| :--- | :--- | :--- | :--- | :--- |
| **GEI-001** | Multi-Region Mesh | None | High | Cross-Region Replication Engine & CRDT Resolver (`replication-engine.ts`) |
| **GEI-002** | Multi-Region Mesh | GEI-001 | Medium-High | Global Query Router & Regional Health Selector (`query-router.ts`) |
| **GEI-003** | Multi-Region Mesh | GEI-001, GEI-002 | Medium-High | Vector Clock Sync Queue & Event Bus (`vector-clock.ts`) |
| **GEI-004** | Multi-Region Mesh | GEI-001..GEI-003 | Medium | Mesh DB Tracking Schema & Admin API Routes |
| **GEI-005** | Multi-Region Mesh | GEI-001..GEI-004 | Medium | Multi-Region Data Mesh Integration Test Suite |
| **GEI-006** | Predictive Analytics | None | Medium-High | Academic Interaction Feature Extractor (`feature-extractor.ts`) |
| **GEI-007** | Predictive Analytics | GEI-006 | High | Student Success Prediction & Learning Path Engine (`prediction-engine.ts`) |
| **GEI-008** | Predictive Analytics | GEI-006, GEI-007 | Medium | Real-Time Inference API & Alert Dispatcher |
| **GEI-009** | Predictive Analytics | GEI-007, GEI-008 | Medium | Predictive Analytics DB Schema & Model Registry |
| **GEI-010** | Predictive Analytics | GEI-006..GEI-009 | Medium | Predictive Analytics Verification & Precision Test Suite |
| **GEI-011** | Hybrid Streaming | None | High | WebRTC Signaling Protocol & SFU Session Manager (`webrtc-signaling.ts`) |
| **GEI-012** | Hybrid Streaming | GEI-011 | Medium-High | Low-Latency HLS Stream Segmenter & Archiver (`hls-segmenter.ts`) |
| **GEI-013** | Hybrid Streaming | GEI-011, GEI-012 | Medium-High | Real-Time Collaboration Bridge & Streaming API Routes |
| **GEI-014** | Hybrid Streaming | GEI-011..GEI-013 | Medium | Distance Learning Streaming Verification Test Suite |
| **GEI-015** | DB Cluster Certification | None | Medium-High | PostgreSQL Cluster Health & Replication Monitor (`cluster-monitor.ts`) |
| **GEI-016** | DB Cluster Certification | GEI-015 | High | Automated Cluster Failover Manager & Live Migrator (`failover-manager.ts`) |
| **GEI-017** | DB Cluster Certification | GEI-015, GEI-016 | Medium | PostgreSQL Cluster Failover Safety Test Suite |
| **GEI-018** | Integration & Hardening | GEI-005,010,014,017 | Medium | Multi-Region Performance & WebRTC Latency Benchmark Suite |
| **GEI-019** | Integration & Hardening | GEI-005,010,014,017 | Medium-High | Cross-Region Security Invariants Audit Test Suite |
| **GEI-020** | Documentation & Release| GEI-001..GEI-019 | Medium | Architecture Guide & Release Certification Documentation |

---

## Verification Plan & Test Strategy

### Automated Unit & Integration Tests

1. **Multi-Region Data Mesh Tests (`multi-region-mesh.test.ts`):**
   - Verify asynchronous cross-region mutation serialization and vector clock ordering.
   - Assert LWW-CRDT correctly resolves concurrent edits with identical or conflicting timestamps.
   - Confirm global query router redirects queries to secondary nodes when primary region health pings fail.

2. **Predictive Learning Analytics Tests (`predictive-analytics.test.ts`):**
   - Test feature extraction accuracy across academic, attendance, and LMS interaction datasets.
   - Verify risk calculation engine produces deterministic student risk scores and recommendations.
   - Assert inference API endpoint returns risk vectors with <100ms response latency at p95.

3. **Hybrid Classroom Streaming Tests (`streaming-integration.test.ts`):**
   - Test WebRTC SDP offer/answer exchange and ICE candidate negotiation.
   - Verify HLS segmenter generates valid `.m3u8` playlists and audio/video segments.
   - Assert streaming session setup completes in under 500ms.

4. **PostgreSQL Failover Tests (`postgres-failover.test.ts`):**
   - Confirm automated failover manager detects primary node failure and promotes standby node in <30 seconds.
   - Verify connection pool dynamic re-routing without orphaned database connections.
   - Assert zero data loss on synchronous standby nodes during failover simulation.

### Security Verification

- **Multi-Tenant Isolation Guard:** Verify zero data leakage across cross-region replication event buses, WebRTC streaming rooms, and predictive analytics models.
- **Data Residency Compliance:** Enforce tenant-level region routing constraints to ensure GDPR and local privacy compliance for cross-border data sync.
- **RBAC API Protection:** Ensure all administrative endpoints (`/api/admin/mesh/*`, `/api/admin/analytics/*`, `/api/admin/database/cluster/*`) require explicit high-level permissions (`mesh:admin`, `analytics:manage`, `database:admin`).

### Performance Verification

- **Cross-Region Replication Sync Latency:** Cross-region replication data sync latency must remain <5 seconds for 99.9% of operations.
- **Predictive Inference Latency:** Predictive student success API responses must return in <100ms at p95.
- **WebRTC Connection Setup:** WebRTC signaling handshake and media stream setup must complete in <500ms.
- **PostgreSQL Failover Speed:** Automated cluster failover must complete node promotion and pool update in <30 seconds.

---

## Risks & Mitigation Matrix

| Risk Scenario | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Cross-Region Data Inconsistency** | High | Medium | Implement LWW-CRDTs with vector clocks (`GEI-001`) and automated conflict resolution logs. |
| **WebRTC Media Transport Failure** | High | Medium | Provide automatic fallback to low-latency HLS streaming (`GEI-011`, `GEI-012`) and STUN/TURN relays. |
| **Predictive Model Inference Latency Overhead** | Medium | Medium | Decouple feature extraction into async workers and cache pre-computed risk vectors in Redis (`GEI-006`, `GEI-008`). |
| **PostgreSQL Split-Brain Failover Condition** | High | Low | Enforce odd-numbered node quorum consensus, stonith fencing, and pre-promotion lag validation (`GEI-015`, `GEI-016`). |

---

## Rollback & Contingency Plan

1. **Multi-Region Data Mesh:** If cross-region replication encounters network partition failures, the sync queue retains un-acknowledged events in `sync-queue.ts` and falls back to localized regional operation until network connectivity resumes.
2. **Predictive Learning Analytics:** If feature extraction or risk scoring fails, the system falls back to standard rule-based academic thresholds without affecting core ERP gradebook or attendance workflows.
3. **WebRTC/HLS Live Streaming:** If WebRTC peer signaling fails, the streaming component gracefully degrades to standard HLS video streaming mode with minimal interactive functionality.
4. **PostgreSQL Cluster Failover:** If automated failover promotion fails pre-validation checks, the system aborts node promotion, keeps the existing topology in read-only safe mode, and alerts database administrators for manual intervention.

---

## Definition of Done

This sprint is certified **COMPLETE** when all the following AIOS v3.1 criteria are satisfied:

1. **Implementation Complete:** All 20 tasks (GEI-001 through GEI-020) implemented without placeholders or incomplete stubs.
2. **Build & Type Safety:** Clean compilation with zero TypeScript errors (`npx tsc --noEmit`) and zero ESLint errors.
3. **Test Suite Coverage:** All 6 new test suites pass with 100% pass rate, maintaining total codebase pass rate across all suites.
4. **Security & Performance:** Verified zero cross-tenant data leakage, cross-region replication <5s, prediction inference <100ms p95, WebRTC setup <500ms, and DB failover <30s.
5. **Documentation Updated:** `docs/global-education-intelligence-guide.md`, `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` fully updated.
