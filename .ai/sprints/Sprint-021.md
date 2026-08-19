# Implementation Contract: Sprint-021 Swarm Visualization & Automated Remediation Integration

**Sprint ID:** SWARM-VISUALIZATION-AUTO-REMEDIATION-021 (SV-AR-021)  
**Sprint Name:** Swarm Visualization & Automated Remediation Integration  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-08-04  
**Target Execution:** 2026-08-05 to 2026-09-02  
**Estimated Duration:** 3–4 weeks (120–160 engineering hours)  
**Risk Level:** Medium-High (Real-time SSE subscription scaling, visualization rendering performance, remediation false positives, approval gate blocking)  
**Classification:** AIOS v3.5 Official Implementation Contract  
**Target Release Version:** v3.5.0 (Swarm Topology Dashboard, Telemetry Pipeline, Remediation Workflow Engine, Historical Playback)

---

## Executive Summary

Sprint-021 executes the **Swarm Visualization & Automated Remediation Integration** evolution, advancing ThaibaHive from v3.4.0 into **v3.5.0**. Following the successful completion of Sprint-020—which delivered autonomic multi-agent swarms with Vickrey auctions, wait-for-graph cycle detectors, compressed vector clocks, and rule-based compliance engines (v3.4.0)—the platform has achieved decentralized intelligence.

This sprint makes these invisible background autonomic operations fully observable and actionable. It delivers interactive React/Next.js dashboard interfaces for agent swarm topology, real-time performance telemetry for the vector-mesh engine, continuous compliance monitoring views, and an event-driven automated remediation engine that connects compliance engine findings with Sprint-019's self-healing agents via strict, human-in-the-loop approval gates.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation

The proposed Sprint-021 architecture is structurally sound and integrates cleanly with the existing codebase:
- **Telemetry Hooking:** Implemented as lightweight, asynchronous hooks inside existing classes (`VectorMeshOptimizer`, `NegotiationCoordinator`, and `SwarmCoordinator`) that publish events to an in-memory event bus, ensuring less than 2% CPU overhead.
- **Real-Time Pipeline (SSE):** Extends the existing Server-Sent Events infrastructure. By using lightweight, batched SSE events rather than persistent bidirectional WebSockets, we reduce connection state memory and simplify multi-region routing.
- **Remediation Workflows:** Leverages existing self-healing agents (from Sprint-019). The workflow engine acts as a mediator, matching compliance engine violation alerts (Sprint-020) to healer action triggers (Sprint-019) through permission-checked endpoints.
- **UI Dashboard:** Built as Next.js 16 App Router components using Tailwind CSS 3.4 and Radix UI primitives. We ensure WCAG 2.1 AA compliance and prevent loading screen hangs by using strict skeletons and `.catch()` hooks on all async fetch operations.

### Technical Risks Identified & Mitigations

1. **Dashboard UI Rendering Overhead with Large Swarms**
   - *Challenge:* Rendering hundreds of active nodes and negotiation paths using standard React state could cause layout thrashing and UI lag.
   - *Mitigation:* Optimize SVG rendering with node-clustering/virtualization and offload heavy graph layouts to web workers or static coordinates if the node count exceeds 64.
2. **Remediation False Positives causing System Instabilities**
   - *Challenge:* An incorrect compliance rule finding might trigger automated healing (e.g., restarting pool connections or purging queues), causing cascade failures.
   - *Mitigation:* Require explicit human-in-the-loop approval for all High-Severity remediations. Provide dry-run executions for rules and include automatic state-rollback/compensation mechanisms.
3. **SSE Connection Leakage under Heavy Admin Load**
   - *Challenge:* SSE streams are HTTP connections; if administrators leave dashboards open, active connections can exhaust the web server socket pool.
   - *Mitigation:* Implement connection heartbeat limits (e.g., auto-disconnect after 15 minutes of inactivity) and rate limit connection subscription requests per user session.

---

## Scope & Out of Scope

### In Scope

1. **Telemetry Pipeline & Observability Database:**
   - Swarm observability database schema (`swarm_observability.ts`) for events, metrics, and remediation logs.
   - Core event hook utilities to capture agent negotiations, sync compaction events, and compliance violations.
   - A Server-Sent Events (SSE) router distributing live updates to subscribed administrative clients.
   - Authenticated REST API endpoints for metrics retrieval, historical logs, and active topology.

2. **React/Next.js Visualization Dashboard:**
   - Real-time 3-tier Swarm Topology graph visualizing local/regional/global agent status and partitions.
   - Negotiation Session viewer displaying active bids, Pareto utilities, and deadlock graphs.
   - Performance Telemetry dashboard charting sync latency (p50/p95), clock compactions, and merge speeds.
   - Compliance Monitoring view displaying live checks, active alerts, and regulatory trend graphs.
   - A consolidated, responsive administrator console with robust skeleton states and error boundaries.

3. **Automated Remediation Engine:**
   - Remediation workflow engine matching compliance violations to target self-healing agents.
   - Human-in-the-loop approval gateway with verification screens and interactive decision keys.
   - Action rollback handlers executing compensation steps on failed remediation attempts.
   - Complete remediation audit trails tracking violation -> alert -> approval -> remediation -> rollback/success.

4. **Diagnostics & Analytics:**
   - Operations Playback CLI/controller for historical swarm operations replay.
   - Basic vector-mesh sync latency anomaly detector flagging metrics deviations.
   - Diagnostics endpoint integration with Sprint-019 Executive Voice Copilot.

### Explicitly Out of Scope

- Designing new self-healing agents. The engine will reuse existing healers (DB, edge, pool, stream healers) created in Sprint-019.
- Modifying baseline compliance rules or database schema fields established in Sprint-020.
- Creating native mobile UI screens for the Flutter companion app. Dashboard access is strictly scoped to the web console (mobile responsiveness is handled via responsive Tailwind layout).
- Auto-approving Critical or High-severity remediation actions. High-risk actions must pass through human approval gates.

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule** documented in `AGENTS.md`, this implementation contract was submitted for multi-model technical review to **OpenCode (Local-Ollama)** and **Claude Code**. The following architectural and verification enhancements were incorporated into the task specifications:

### OpenCode (Local-Ollama) Feedback:
1. **Remediation Concurrency Handling (OpenCode):** Added explicit concurrency queuing requirements to `remediation-engine.ts` (Task SV-AR-012) to ensure parallel compliance alerts targeting the same resource are handled deterministically without state thrashing.
2. **Signature Verification Hardening (OpenCode):** Added explicit signature timestamp expiration validation requirements to `healer-connector.ts` (Task SV-AR-013) to prevent replay attacks on healer commands.
3. **Remediation Idempotency (OpenCode):** Added requirement for double-approval verification and idempotency checks in the approval gateway endpoint (Task SV-AR-014) to prevent duplicate execution of the same healing action.
4. **Chaos Testing on Rollback Failures (OpenCode):** Required that the rollback handler (Task SV-AR-015) gracefully handles failures during rollback execution (e.g. database network loss) by logging a critical escalation rather than looping indefinitely.
5. **Audit Trail Immutability (OpenCode):** Imposed schema-level and API-level assertions in the historical database (Task SV-AR-016) to verify that logged remediation histories are immutable and append-only.

### Claude Code Feedback:
1. **Index Optimization for Telemetry (Claude Code):** Added explicit indexing requirements to `swarm_observability.ts` (Task SV-AR-001) targeting `timestamp`, `node_id`, and `metric_name` columns to optimize querying timeseries telemetry data.
2. **In-Memory Batching & Event Filtering (Claude Code):** Added in-memory batch buffering and event-filtering capabilities to `event-bus.ts` (Task SV-AR-002) to prevent telemetry serialization from introducing CPU bottlenecks on critical execution paths.
3. **SSE Connection Limits & Pooling (Claude Code):** Added connection pooling/max-connection limit checks to `sse-manager.ts` (Task SV-AR-003) to prevent resource exhaustion from open SSE sessions.
4. **Metrics Aggregation Handler (Claude Code):** Added a metrics aggregation service (Task SV-AR-004) to group raw metrics into 1-minute time-series buckets before writing to the database, optimizing storage growth.

---

## Detailed Task Breakdown

### Phase 1: Telemetry Pipeline & Database Foundation

#### Task SV-AR-001: Swarm Database Schema Extensions & Historical Persistence
- **Task ID:** SV-AR-001
- **Description:** Implement database schema extensions for swarm observability including tables for telemetry events, metrics timeseries, and remediation histories.
- **Files:**
  - `packages/db/src/schema/swarm_observability.ts` [NEW]
  - `packages/db/src/index.ts` [MODIFY - export schema]
  - `src/db/schema.ts` [MODIFY - re-export schema]
- **Dependencies:** None
- **Acceptance Criteria:**
  - Creates `swarm_events` table for logs with event source, severity (`info | warning | error | critical`), and metadata JSON fields.
  - Creates `swarm_metrics` table for timeseries metrics (latency, compact time, queue size) with node ID and metric name indices.
  - Creates `remediation_history` table tracking actions, compliance findings, approvals, and outcomes.
  - Creates index on `swarm_events(timestamp)`.
  - Creates composite indexes on `swarm_metrics(node_id, metric_name)` and `swarm_metrics(timestamp)`.
  - All timestamps use `text` type with ISO string formatting.
  - Drizzle migration generates cleanly for SQLite and PostgreSQL.
- **Verification Method:** Run `npx drizzle-kit generate` and verify schema output. Verify indices are correctly generated.
- **Estimated Complexity:** Medium

#### Task SV-AR-002: Observability Event Collectors (Telemetry Hooking)
- **Task ID:** SV-AR-002
- **Description:** Integrate lightweight event collectors and performance hook macros in existing negotiation, vector-mesh, and coordination classes to publish telemetry.
- **Files:**
  - `src/lib/observability/event-bus.ts` [NEW]
  - `src/lib/sync/vector-mesh-optimizer.ts` [MODIFY - add sync metrics hooks]
  - `src/lib/agents/negotiation/negotiation-coordinator.ts` [MODIFY - add negotiation outcome hooks]
  - `src/lib/agents/swarm/swarm-coordinator.ts` [MODIFY - add topology/partition hooks]
- **Dependencies:** SV-AR-001
- **Acceptance Criteria:**
  - `event-bus.ts` implements an in-memory event bus with ring-buffer storage of the last 1000 events.
  - Implements event batching/buffering inside the event bus (e.g. flushing queue after 100 events or 5 seconds) to minimize lock contention.
  - Implements configurable event-filtering rules so administrative toggles can disable low-priority event emission to minimize CPU utilization.
  - Hooks in `vector-mesh-optimizer.ts` publish compaction times, latency values, and node status on every merge operation.
  - Hooks in `negotiation-coordinator.ts` publish bidding rounds, active bids, and outcomes.
  - Hook overhead adds less than 1.5ms to critical paths.
- **Verification Method:** Unit test mock events emitted from mock classes and ensure correct collection in the ring-buffer.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-003: Server-Sent Events (SSE) Streaming Pipeline
- **Task ID:** SV-AR-003
- **Description:** Implement the SSE stream router to push real-time swarm telemetry, negotiation status changes, and compliance alerts to connected dashboard clients.
- **Files:**
  - `src/app/api/admin/swarm/stream/route.ts` [NEW]
  - `src/lib/observability/sse-manager.ts` [NEW]
- **Dependencies:** SV-AR-002
- **Acceptance Criteria:**
  - Endpoint `/api/admin/swarm/stream` opens a persistent HTTP text/event-stream connection.
  - Authenticates client JWT using standard middleware; requires `observability:read` permission.
  - Subscribes client to `event-bus.ts` and pushes structured events (heartbeats, metrics, alerts) immediately.
  - Implements connection pooling/max-connection limits (default maximum 100 active connections) to protect system threads.
  - Automatically cleans up connections on client disconnect, preventing socket memory leaks.
- **Verification Method:** Open a client connection with mock authorization headers; assert SSE heartbeat pulses every 15 seconds and mock events are delivered within 100ms. Limit validation must drop 101st connection.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-004: Swarm Observability API Routes
- **Task ID:** SV-AR-004
- **Description:** Create the REST API endpoints to fetch historical telemetry, negotiation history logs, and remediation statistics.
- **Files:**
  - `src/app/api/admin/swarm/metrics/route.ts` [NEW]
  - `src/app/api/admin/swarm/sessions/route.ts` [NEW]
  - `src/app/api/admin/swarm/topology/route.ts` [NEW]
  - `src/lib/observability/metrics-aggregator.ts` [NEW]
- **Dependencies:** SV-AR-001, SV-AR-002
- **Acceptance Criteria:**
  - API routes require `requireAuth` wrapper with `observability:read` permission.
  - Restricts data return scoped strictly by `institutionId` (multi-tenant boundaries).
  - `/metrics` returns time-windowed averages for sync latency (p50/p95) and compaction metrics.
  - Integrates `metrics-aggregator.ts` to execute background rollups of metrics into 1-minute buckets before persisting to db.
  - `/sessions` returns paginated list of negotiation auction bids and outcomes.
  - `/topology` returns current hierarchical parent-child status graph.
- **Verification Method:** Perform mock HTTP GET queries with varying parameters and verify tenant isolation logic checks out. Check db size optimization under simulated high metric load.
- **Estimated Complexity:** Medium

#### Task SV-AR-005: Infrastructure Foundation Integration Tests
- **Task ID:** SV-AR-005
- **Description:** Build integration tests verifying all database writes, event hooks, SSE delivery, and API endpoint routing.
- **Files:**
  - `src/lib/__tests__/observability-foundation.test.ts` [NEW]
- **Dependencies:** SV-AR-001 through SV-AR-004
- **Acceptance Criteria:**
  - Verifies multi-tenant isolation tests assert errors if request contains mismatching client tenant variables.
  - Achieves 100% path coverage for SSE manager, metrics query routines, and API router methods.
  - Asserts event hooking does not block executing transaction loops.
- **Verification Method:** Run `npx jest src/lib/__tests__/observability-foundation.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 2: Swarm Observability Frontend

#### Task SV-AR-006: Swarm Topology Component
- **Task ID:** SV-AR-006
- **Description:** Implement the interactive Swarm Topology hierarchy component using React-Flow or custom SVG layout to visualize the 3-tier local-regional-global network.
- **Files:**
  - `src/components/swarm/SwarmTopology.tsx` [NEW]
- **Dependencies:** SV-AR-003, SV-AR-004
- **Acceptance Criteria:**
  - Renders hierarchical tree layout: Global Coordinator (root) -> Regional Coordinators (mid-tier) -> Local Agents (leaves).
  - Highlights active partitions as flashing nodes/connections, styling with `<Badge variant="warning">` or `<Badge variant="destructive">` for alerts.
  - Clicking a node opens a details modal with ID, role, health score, and sync throughput metrics.
  - Fits neatly on tablet and desktop viewports.
- **Verification Method:** Component snapshot test with mock hierarchical data structure; verify node selection callbacks.
- **Estimated Complexity:** High

#### Task SV-AR-007: Negotiation Session Tracker Component
- **Task ID:** SV-AR-007
- **Description:** Create the negotiation session widget displaying active auctions, Vickrey bids, and deadlock wait-for graphs in real-time.
- **Files:**
  - `src/components/swarm/NegotiationTracker.tsx` [NEW]
- **Dependencies:** SV-AR-003, SV-AR-004
- **Acceptance Criteria:**
  - Displays a running list of active and recent sessions showing resource types and negotiation status.
  - Renders a live timeline of bids received per session, showing agent IDs and bidding weights.
  - Visualizes wait-for loop deadlocks as circular graph overlays, indicating which agents are blocked.
  - Avoids styling variables override; relies entirely on CSS variables and tailwind presets.
- **Verification Method:** Inject mock deadlock state events and assert circular loop nodes highlight on screen.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-008: Vector-Mesh Telemetry Dashboard Component
- **Task ID:** SV-AR-008
- **Description:** Build the telemetry component graphing vector-mesh metrics including latencies (p50/p95), clock compactions, and sync mode transitions.
- **Files:**
  - `src/components/swarm/TelemetryDashboard.tsx` [NEW]
- **Dependencies:** SV-AR-003, SV-AR-004
- **Acceptance Criteria:**
  - Uses standard chart components with responsive width and height calculations.
  - Renders real-time line charts for merge latency and clock compaction timings updated dynamically via the SSE pipeline.
  - Displays adaptive sync state changes (e.g. switching from `active` to `batched`) using colored status Badges.
  - Implements query time range filters (1h, 24h, 7d).
- **Verification Method:** Test chart updates on receipt of mock SSE telemetry packets.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-009: Compliance Monitoring & Audit Trail View
- **Task ID:** SV-AR-009
- **Description:** Build the compliance monitoring frontend showcasing continuous evaluations, alert states, and historical regulatory compliance indices.
- **Files:**
  - `src/components/swarm/ComplianceMonitor.tsx` [NEW]
- **Dependencies:** SV-AR-003, SV-AR-004
- **Acceptance Criteria:**
  - Renders cards summarizing status for GDPR, HIPAA, SOC2, FERPA, and MoE standards.
  - Shows warning indicators for rules with pending violations, displaying risk level and failed criteria details.
  - Interactive audit trail list allows searching events and filtering by severity.
  - All modals trigger using Radix UI `<Dialog>` elements for accessibility compliance.
- **Verification Method:** Mock compliance failures and verify screen updates immediately with critical banners.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-010: Dashboard Layout, Skeletons, and Navigation
- **Task ID:** SV-AR-010
- **Description:** Combine topology, tracker, telemetry, and compliance views into a single, cohesive admin dashboard page under `/admin/swarm-intelligence` using strict loading skeletons and error boundaries.
- **Files:**
  - `src/app/(shell)/admin/swarm-intelligence/page.tsx` [NEW]
  - `src/components/swarm/SwarmDashboardSkeleton.tsx` [NEW]
- **Dependencies:** SV-AR-006 through SV-AR-009
- **Acceptance Criteria:**
  - Integrates all sub-components using Next.js App Router conventions.
  - Implements clean `<SwarmDashboardSkeleton>` skeleton loaders; no raw "Loading..." messages are allowed on screen.
  - All fetch actions inside `useEffect` must have catch blocks to avoid stuck infinite load spinners.
  - Ensures a single `<h1>` tag defines the hierarchy structure on the page for SEO best practices.
- **Verification Method:** Simulates delay in data fetches and validates that correct skeletons are rendered without layout shifts.
- **Estimated Complexity:** Medium

#### Task SV-AR-011: Swarm Frontend Verification Suite
- **Task ID:** SV-AR-011
- **Description:** Run component unit tests and visual rendering checks for the dashboard layout, skeletons, and individual graph widgets.
- **Files:**
  - `src/components/swarm/__tests__/SwarmDashboard.test.tsx` [NEW]
- **Dependencies:** SV-AR-010
- **Acceptance Criteria:**
  - Achieves > 85% component test coverage.
  - Confirms component mock data bindings correctly populate charts, graphs, and badge variants.
  - Verifies screen reflow handles mobile, tablet, and widescreen layouts smoothly.
- **Verification Method:** Run `npx jest src/components/swarm/__tests__/SwarmDashboard.test.tsx`.
- **Estimated Complexity:** Medium

---

### Phase 3: Automated Remediation Engine

#### Task SV-AR-012: Remediation Event Router & Workflow Engine
- **Task ID:** SV-AR-012
- **Description:** Implement the remediation engine that listens to compliance alerts, maps violations to healing policies, and schedules actions.
- **Files:**
  - `src/lib/remediation/remediation-engine.ts` [NEW]
  - `src/lib/remediation/types.ts` [NEW]
- **Dependencies:** SV-AR-001, SV-AR-002
- **Acceptance Criteria:**
  - Listens to compliance engine violation events.
  - Evaluates rule mappings (e.g. `SOC2:DB_LEAK` -> trigger `DatabaseHealer`).
  - Creates a `RemediationWorkflow` instance with a state machine tracking states: `detected | pending_approval | executing | succeeded | failed | rolled_back`.
  - Persists status updates to `remediation_history` database table.
  - Handles concurrent compliance alerts targeting the same resource through a FIFO queuing pipeline to prevent state thrashing.
- **Verification Method:** Unit test workflow creation, mapping matching, and state machine transitions using mock violation events. Run a validation harness to assert that parallel concurrent compliance events targeting the same healer are queued and executed in deterministic order, with zero state thrashing.
- **Estimated Complexity:** High

#### Task SV-AR-013: Self-Healing Agent Connector & Trigger Layer
- **Task ID:** SV-AR-013
- **Description:** Create the connection layer between the workflow engine and the existing self-healing agents (from Sprint-019) to execute corrective procedures.
- **Files:**
  - `src/lib/remediation/healer-connector.ts` [NEW]
- **Dependencies:** SV-AR-012
- **Acceptance Criteria:**
  - Implements standard connection interface to command healers (`DatabaseHealer`, `PoolHealer`, `StreamHealer`, `EdgeHealer`).
  - Ensures commands are signed and contain validation tokens, preventing unauthorized execution.
  - Signatures must include cryptographically verified timestamp fences that expire after 10 seconds to prevent message replay.
  - Provides execution timeout handling (e.g. aborting action if healer does not report success in 60s).
- **Verification Method:** Mock execution payloads and assert the corrector triggers mock healer methods. Verify that API calls are signed with HSM/KMS keys, and test signature expiration cases using expired mock certificates.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-014: Multi-Level Approval Gateway & Human-in-the-Loop Workflow
- **Task ID:** SV-AR-014
- **Description:** Implement approval gate validations, notifying admins of pending critical actions and gating execution.
- **Files:**
  - `src/lib/remediation/approval-gateway.ts` [NEW]
  - `src/app/api/admin/remediation/approve/route.ts` [NEW]
- **Dependencies:** SV-AR-012, SV-AR-013
- **Acceptance Criteria:**
  - Compliance warnings with severity `high` or `critical` enter `pending_approval` state.
  - Dispatches approval requests via the notification pipeline and registers validation keys.
  - `/approve` API endpoint verifies admin permission (`remediation:approve`) and signature validation key.
  - Resumes execution instantly on valid approval, or moves to `cancelled` on rejection.
  - Protects against duplicate approval signals through strict database transaction-level lock checks (idempotence).
- **Verification Method:** Simulate high-severity alert; assert action is paused; verify API call with correct key triggers healer and API call with invalid token returns HTTP 403. Run an automated test simulating concurrent approvals of the same action to verify idempotency checks prevent duplicate executions.
- **Estimated Complexity:** High

#### Task SV-AR-015: Automated Rollback Mechanism for Remediation Actions
- **Task ID:** SV-AR-015
- **Description:** Implement action rollback routines that execute compensation tasks if a self-healing action fails.
- **Files:**
  - `src/lib/remediation/rollback-handler.ts` [NEW]
- **Dependencies:** SV-AR-012, SV-AR-013
- **Acceptance Criteria:**
  - Workflow defines rollback strategy mapping for each remediation (e.g., restore previous pool configuration parameters, reconnect node replica).
  - Automatically triggers compensation actions if the healer returns an execution error or times out.
  - Rollback failure due to downstream system disconnect (e.g. database network loss) must abort further execution and log a critical diagnostic event rather than retrying indefinitely.
  - Emits telemetry alerts detailing rollback status to the visual console.
  - Changes state to `rolled_back` upon successful completion of the compensation task.
- **Verification Method:** Simulate a failed execution in a healer; assert the rollback task is executed and the database stores `rolled_back` state. Run chaos testing simulating network timeouts during the rollback execution to verify the engine logs the failed rollback as critical-escalation without entering infinite retry loops.
- **Estimated Complexity:** High

#### Task SV-AR-016: Historical Remediation Audit Log & Transparency Layer
- **Task ID:** SV-AR-016
- **Description:** Create API routes and UI lists displaying active and historical remediation logs with complete timelines.
- **Files:**
  - `src/app/api/admin/remediation/history/route.ts` [NEW]
  - `src/components/swarm/RemediationHistory.tsx` [NEW]
- **Dependencies:** SV-AR-001, SV-AR-012
- **Acceptance Criteria:**
  - API endpoint returns paginated remediation events, strictly filtered by `institutionId`.
  - UI component renders visual timeline showing step progression (Detection -> Review -> Execution -> Result).
  - Renders action control buttons (Approve/Reject) directly inside a Radix UI dialog for pending items.
  - DB schema and SQL triggers assert that remediation histories are immutable and append-only once successfully resolved or aborted.
- **Verification Method:** Test API pagination, SQL tenant filtering checks, and interface rendering behavior. Perform database constraint validation tests to verify audit logs cannot be modified once written.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-017: Remediation Engine Integration Test Suite
- **Task ID:** SV-AR-017
- **Description:** Build end-to-end integration tests validating the rule matcher, state machine, approval gates, and rollback strategies.
- **Files:**
  - `src/lib/__tests__/remediation-engine.test.ts` [NEW]
- **Dependencies:** SV-AR-012 through SV-AR-016
- **Acceptance Criteria:**
  - Achieves 100% logic coverage on all transition branches of the remediation state machine.
  - Mocks healer responses to test success, failure, timeout, and rollback flows.
  - Verifies multi-tenant data filters reject queries attempting to fetch logs across institutional boundaries.
- **Verification Method:** Run `npx jest src/lib/__tests__/remediation-engine.test.ts`. This test suite must verify edge cases including: concurrent remediation requests, handler crash recovery, approval timeout transitions, and successful rollback of nested remediations.
- **Estimated Complexity:** Medium-High

---

### Phase 4: Diagnostics & Advanced Observability

#### Task SV-AR-018: Historical Replay Engine (Playback CLI/Controller)
- **Task ID:** SV-AR-018
- **Description:** Implement an engine capable of querying historical event logs and replaying them step-by-step to diagnose swarm sync conflicts or negotiation deadlocks.
- **Files:**
  - `src/lib/observability/playback-engine.ts` [NEW]
  - `src/scripts/swarm-playback.ts` [NEW - CLI script]
- **Dependencies:** SV-AR-001, SV-AR-002
- **Acceptance Criteria:**
  - `playback-engine.ts` reads events from `swarm_events` and `swarm_metrics` databases within a specified timestamp window.
  - Simulates the sequence of events in tick-by-tick format.
  - CLI script allows pausing, stepping, and fast-forwarding through historical streams.
- **Verification Method:** Seed trace logs; execute CLI script with target time frames; verify output logs match source events.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-019: Vector-Mesh Performance Anomaly Detector
- **Task ID:** SV-AR-019
- **Description:** Implement a telemetry analytics routine that monitors vector-mesh metrics and flags performance anomalies.
- **Files:**
  - `src/lib/observability/anomaly-detector.ts` [NEW]
- **Dependencies:** SV-AR-001, SV-AR-002
- **Acceptance Criteria:**
  - Calculates moving average and standard deviation of vector-mesh latency.
  - Flags events where current latency exceeds three standard deviations from historical averages.
  - Emits warning events to the event bus, which bubble up to the SSE dashboard alert window.
- **Verification Method:** Run mock high-latency event sequence; verify anomaly detection algorithm emits correct warnings.
- **Estimated Complexity:** Medium

#### Task SV-AR-020: Swarm Diagnostics Command & Voice Integration
- **Task ID:** SV-AR-020
- **Description:** Extend the Executive Voice Copilot diagnostic functions (from Sprint-019) to return swarm status summaries.
- **Files:**
  - `src/lib/agents/voice/voice-diagnostics-handler.ts` [MODIFY - add swarm commands]
- **Dependencies:** SV-AR-002, SV-AR-012
- **Acceptance Criteria:**
  - Registers query phrases: `"status of agent swarm"`, `"check vector-mesh sync latency"`, `"remediation logs"`.
  - Formulates spoken text outputs summarizing connected nodes, average latencies, and pending approvals.
  - Protects speech-triggered diagnostic queries with proper authentication checks.
- **Verification Method:** Unit test voice command parser with mock speech tokens and assert spoken summaries are formatted correctly.
- **Estimated Complexity:** Medium

---

### Phase 5: Release Verification & Documentation

#### Task SV-AR-021: End-to-End System Integration Test
- **Task ID:** SV-AR-021
- **Description:** Construct the final E2E test verifying the integration from compliance detection to healing, approval gates, and telemetry dashboard state updates.
- **Files:**
  - `src/lib/__tests__/swarm-remediation-e2e.test.ts` [NEW]
- **Dependencies:** SV-AR-001 through SV-AR-020
- **Acceptance Criteria:**
  - Triggers compliance violation -> validates alert is published -> validates workflow pauses for approval -> approves -> validates self-healing action -> validates rollback is not executed -> verifies final telemetry data matches.
  - Achieves 100% flow verification without throwing unhandled exceptions.
- **Verification Method:** Run `npx jest src/lib/__tests__/swarm-remediation-e2e.test.ts`.
- **Estimated Complexity:** Medium-High

#### Task SV-AR-022: Regression Testing and Clean Build Verification
- **Task ID:** SV-AR-022
- **Description:** Run all existing test suites and perform full compilation and linting validation.
- **Files:** None (testing only)
- **Dependencies:** SV-AR-021
- **Acceptance Criteria:**
  - All test suites (including baseline tests) pass.
  - `npx tsc --noEmit` returns zero errors.
  - ESLint reports zero errors and does not increase warning counts above baseline.
- **Verification Method:** Execute `npx jest` and `npx tsc --noEmit` and check output.
- **Estimated Complexity:** Low

#### Task SV-AR-023: Swarm Observability Runbook & Operations Guide
- **Task ID:** SV-AR-023
- **Description:** Create the operator's runbook detailing visual dashboards, configuring remediation rules, and managing rollbacks.
- **Files:**
  - `docs/swarm-observability-remediation-guide.md` [NEW]
- **Dependencies:** SV-AR-001 through SV-AR-020
- **Acceptance Criteria:**
  - Document guides administrators on using topology visualizations, interpreting telemetry metrics, and handling approval requests.
  - Explains troubleshooting commands and operating rollback configurations.
- **Verification Method:** Review document structure and content against checklists.
- **Estimated Complexity:** Medium

#### Task SV-AR-024: Feature Registry & Release Metadata Update
- **Task ID:** SV-AR-024
- **Description:** Register Sprint-021 features, log change items, and update project status files to target release version v3.5.0.
- **Files:**
  - `.ai/FEATURES.md` [MODIFY - add Sprint-021 features]
  - `.ai/CHANGELOG.md` [MODIFY - log v3.5.0 version updates]
  - `.ai/PROJECT_STATUS.md` [MODIFY - set Sprint-021 to Completed status]
- **Dependencies:** SV-AR-001 through SV-AR-023
- **Acceptance Criteria:**
  - Modifies `.ai/FEATURES.md` to register the new features.
  - Enters change items in `.ai/CHANGELOG.md` for version v3.5.0.
  - Updates `.ai/PROJECT_STATUS.md` to mark Sprint-021 tasks as complete.
- **Verification Method:** Perform git diff check of modified files.
- **Estimated Complexity:** Low

---

## Task Summary Table

| Task ID | Phase | Component / Area | Dependencies | Est. Complexity | Target Deliverable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SV-AR-001** | Phase 1 | Database Schema | None | Medium | Database schema extensions for telemetry and remediation (`swarm_observability.ts`) |
| **SV-AR-002** | Phase 1 | Event Collectors | SV-AR-001 | Medium-High | Telemetry event hooking code for optimizer, negotiator, and coordinators |
| **SV-AR-003** | Phase 1 | Event Streaming | SV-AR-002 | Medium-High | Real-time SSE streaming endpoint for dashboard telemetry |
| **SV-AR-004** | Phase 1 | API Routing | SV-AR-001, 002 | Medium | API routes serving historical metrics, logs, and topologies |
| **SV-AR-005** | Phase 1 | Testing | SV-AR-001..004 | Medium | Integration tests for database schema, event hooks, and API endpoints |
| **SV-AR-006** | Phase 2 | Topology Widget | SV-AR-003, 004 | High | Interactive Swarm Topology visualization chart component |
| **SV-AR-007** | Phase 2 | Negotiation Widget| SV-AR-003, 004 | Medium-High | Real-time negotiation tracking and deadlock display UI components |
| **SV-AR-008** | Phase 2 | Telemetry Widget | SV-AR-003, 004 | Medium-High | Dashboard component graphing vector-mesh metrics and sync modes |
| **SV-AR-009** | Phase 2 | Compliance View | SV-AR-003, 004 | Medium-High | Compliance monitoring list and audit trails interactive component |
| **SV-AR-010** | Phase 2 | UI Layout | SV-AR-006..009 | Medium | Dashboard landing page wrapper with loader skeletons and error handlers |
| **SV-AR-011** | Phase 2 | UI Verification | SV-AR-010 | Medium | Component unit test suite verifying layouts and mock binding |
| **SV-AR-012** | Phase 3 | Workflow Engine | SV-AR-001, 002 | High | Remediation event routing engine and state machine manager |
| **SV-AR-013** | Phase 3 | Healer Connector | SV-AR-012 | Medium-High | Connector layer to trigger existing healers and trace status |
| **SV-AR-014** | Phase 3 | Approval Gateway | SV-AR-012, 013 | High | Gating logic for critical actions, signatures, and approval web api |
| **SV-AR-015** | Phase 3 | Rollback Handler | SV-AR-012, 013 | High | State rollback routines and compensation event handlers |
| **SV-AR-016** | Phase 3 | History API & UI | SV-AR-001, 012 | Medium-High | UI list and API route serving remediation audit trails and controls |
| **SV-AR-017** | Phase 3 | Testing | SV-AR-012..016 | Medium-High | Integration tests verifying remediation state machines and gates |
| **SV-AR-018** | Phase 4 | Playback Engine | SV-AR-001, 002 | Medium-High | Playback controller and diagnostic CLI script for event tracing |
| **SV-AR-019** | Phase 4 | Anomaly Detector | SV-AR-001, 002 | Medium | Latency deviation monitor and alert dispatcher logic |
| **SV-AR-020** | Phase 4 | Voice Integration | SV-AR-002, 012 | Medium | Swarm status queries support in Executive Voice Copilot handlers |
| **SV-AR-021** | Phase 5 | E2E Integration | SV-AR-001..020 | Medium-High | End-to-end integration test validating the compliance-healing path |
| **SV-AR-022** | Phase 5 | Regression Pass | SV-AR-021 | Low | Full execution verification of all test suites; build stability checks |
| **SV-AR-023** | Phase 5 | Runbook Doc | SV-AR-001..020 | Medium | Swarm observability guide and operational runbook documentation |
| **SV-AR-024** | Phase 5 | Release Sync | SV-AR-001..023 | Low | Update changelogs, feature registers, and project status details |

**Total Tasks:** 24  
**New Test Suites:** 5 (`observability-foundation.test.ts`, `SwarmDashboard.test.tsx`, `remediation-engine.test.ts`, `swarm-remediation-e2e.test.ts`, verification runs)  
**New Source Files:** 16  
**Modified Files:** 5 (`packages/db/src/index.ts`, `src/db/schema.ts`, `src/lib/agents/voice/voice-diagnostics-handler.ts`, add hook imports/calls in baseline engines)

---

## Verification Plan & Test Strategy

### Automated Unit & Integration Tests
- **observability-foundation.test.ts:** Validates schema indices, event emission throughput rates, and multitenant scoping.
- **SwarmDashboard.test.tsx:** Tests rendering components with dynamic mock telemetry inputs, state boundary recovery, skeleton layout visual consistency.
- **remediation-engine.test.ts:** Exercises all remediation state machine paths (approvals, timeouts, execution failures, compensation executions).
- **swarm-remediation-e2e.test.ts:** Simulates end-to-end event workflow: compliance violation fires -> dashboard gets SSE alert -> action is gated -> admin approves via REST API -> healer restarts node -> metrics reflect latency recovery.

### Security Verification
- **RBAC API Gate checks:** Verify endpoints require authentic token signatures and reject requests failing to provide required permissions.
- **Multi-Tenant boundary tests:** Verify data selection queries append `institutionId` equality parameters dynamically, preventing leakage across tenants.
- **Approval Gateway signature keys:** Verify execution commands reject calls containing tampered signature keys or expired nonce timestamps.

### Performance Verification
- **Observability CPU overhead:** Telemetry hook macro execution must add less than 1.5ms to critical optimization paths.
- **SSE connection load:** Ensure streaming gateway handles up to 100 concurrent SSE subscribers without connection leakage or high context switching rates.
- **UI page loads:** Dashboard views must load and bind live charts in less than 500ms with skeleton placeholders rendering seamlessly.

---

## Risks & Mitigation Matrix

| Risk Scenario | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **SSE Connections exhaust thread pool** | Medium-High | Medium | Apply strict heartbeat timeouts, auto-close idle dashboard sessions after 15m. |
| **Remediation loops cascade failures** | Critical | Low | Gated approvals for High-Severity items; maximum cooldown frequency thresholds on healers. |
| **Heavy SVG render overhead** | Medium | Medium | Limit active topology nodes displayed to 64; apply progressive rendering. |
| **False-positive compliance remediation** | High | Low | Multi-stage verification gates; simple CLI rollback utilities in `SV-AR-015`. |

---

## Rollback & Contingency Plan
1. **Disable Telemetry Hooks:** Telemetry emission can be disabled globally via `SWARM_TELEMETRY_ENABLED=false` without code modification.
2. **SSE Streaming:** In case of connection leakage issues, disable the SSE API routes. Dashboard views will gracefully degrade, showing standard loading skeletons with descriptive catch banners.
3. **Disable Remediation Engine:** Remediation engine evaluations can be disabled globally via `AUTO_REMEDIATION_ENABLED=false`. Healing agents revert to standalone manual execution states.
4. **Clean Rollbacks:** Each remediation task stores its target state configuration in `remediation_history` before running, allowing the operator to execute reverse commands via `SV-AR-015`.

---

## Definition of Done
This sprint is certified **COMPLETE** when:
1. **No Application Placeholders:** All 24 tasks are implemented without mock placeholders or code stubs.
2. **Build and Type Checks pass:** `npx tsc --noEmit` and ESLint return zero errors. Warning count is verified to not exceed the baseline of 46 warnings.
3. **100% Test Success:** New test suites compile and pass successfully alongside baseline suites (maintaining 100% pass rate).
4. **Observability limits met:** Execution of telemetry collectors does not exceed 1.5ms overhead; multi-tenant constraints verified in API calls.
5. **Documentation Complete:** Runbook guide `docs/swarm-observability-remediation-guide.md` created; changelogs and project status manifest files are synchronized.
