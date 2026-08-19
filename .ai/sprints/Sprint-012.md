# Implementation Contract: Sprint-012 Predictive Multi-Campus Enterprise Resource Allocation & Real-Time Event-Driven Streaming Architecture

**Sprint ID:** REALTIME-STREAM-012 (SIS-PARENT-012)  
**Sprint Name:** Predictive Multi-Campus Enterprise Resource Allocation & Real-Time Event-Driven Streaming Architecture  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-08-01  
**Target Execution:** 2026-10-15 to 2026-11-15  
**Estimated Duration:** 20–24 days (140–170 hours)  
**Risk Level:** Medium-High  
**Classification:** AIOS v3.0 Official Implementation Contract  
**Target Release Version:** v2.4.0 (Real-Time Event-Driven Architecture & Predictive Allocation Milestone)  

---

## Executive Summary

Sprint-012 executes **Predictive Multi-Campus Enterprise Resource Allocation & Real-Time Event-Driven Streaming Architecture**, evolving ThaibaHive from an AI-augmented enterprise intelligence platform (certified in Sprint-011, v2.3.0) into a **real-time event-driven streaming ecosystem**. Building upon the multi-agent copilot swarms, Redis-backed distributed state management, and time-series financial decomposition established in Sprint-011, this sprint replaces legacy HTTP polling with full-duplex WebSocket and Server-Sent Events (SSE) streaming infrastructure, automates SMS/Push notification triggers for critical risk alerts, deploys predictive student retention models, introduces interactive "What-If" budget scenario simulators, and scales Redis state infrastructure across multi-region clusters using tenant hashtag key sharding (`{tenant_id}:key`).

### Key Business Impact

- **Real-Time Streaming Infrastructure (80% Latency Reduction):** Replaces 5-second HTTP polling loops with <500ms WebSocket/SSE live copilot feeds, real-time agent-to-agent communication logs, and instant analytics streaming.
- **Automated Intervention Triggers (90% Response Time Reduction):** Event-driven trigger engine automatically dispatches SMS (via provider gateway) and push notifications (FCM/APNs) for high-risk chronic absenteeism and fee default alerts, reducing intervention delay from hours to <30 seconds.
- **Predictive Resource Allocation (60% Accuracy Improvement):** Machine-learned student retention models and enrollment forecasting algorithms enable proactive campus resource, staffing, and facility distribution before dropouts or bottlenecks occur.
- **Interactive "What-If" Scenario Simulation (70% Faster Budget Planning):** Drag-and-drop budget scenario simulator with real-time dynamic impact matrix calculations enables instant financial reallocation modeling under 100ms SLA.
- **Redis Cluster Scaling (50% Reliability Improvement):** Multi-region Redis Cluster key sharding using tenant tags (`thaiba:{tenant_id}:*`) guarantees multi-node cluster hash slot alignment and high-availability failover across geographically distributed campuses.

### Strategic Alignment

- Advances product version from v2.3.0 to **v2.4.0 (Real-Time Event-Driven Architecture & Predictive Allocation Milestone)**.
- Extends **Sprint-011 AI Agent Swarms** by streaming copilot reasoning graphs and agent communication messages in real-time.
- Extends **Sprint-011 Redis State Manager** to multi-region Redis Cluster deployments with hashtag key sharding.
- Extends **Sprint-009 Push Router** by introducing automated event-driven trigger rules with SMS gateway fallback.
- Reuses **Sprint-008 Predictive Analytics Engine** for student retention inference and multi-campus forecasting models.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation

The Sprint-012 specification is **technically sound, architecturally scalable, and fully compliant with AIOS standards**. The implementation builds directly on established production foundations:
- Dual-dialect Drizzle ORM schemas (`packages/db/schema.ts` for SQLite dev and `packages/db/schema.pg.ts` for PostgreSQL prod).
- Extended multi-tenant RBAC permissions (`@thaiba/auth`) with real-time streaming and scenario simulation roles (`realtime:stream`, `triggers:manage`, `predictive:retention`, `simulation:budget`).
- Event-driven WebSocket/SSE streaming infrastructure (`realtime-streaming-service.ts`) with sequence numbering, client heartbeat ping/pong, and automatic replay buffers.
- Redis Cluster key sharding manager (`redis-cluster-manager.ts`) using hashtag syntax (`thaiba:{tenant_id}:...`) to force tenant key alignment within identical cluster hash slots.
- Deterministic matrix transformation algorithms for budget scenario simulation operating within Next.js runtime SLA bounds (<100ms).

### Technical Assessment & Risks Identified

1. **WebSocket Connection Instability & Network Proxy Blockers**
   - *Challenge:* Enterprise network firewalls, corporate proxies, or mobile network transitions may terminate persistent WebSocket connections.
   - *Mitigation:* Implement dual-channel transport with seamless Server-Sent Events (SSE) fallback (`sse-handler.ts`), heartbeat ping/pong (every 15s), and client-side reconnect buffering with exponential backoff (`STREAM-004`).

2. **Redis Cluster Hash Slot Mismatch & Multi-Key Operations**
   - *Challenge:* Multi-key commands or pipeline operations across multiple keys fail in Redis Cluster if keys map to different hash slots.
   - *Mitigation:* Enforce strict tenant hashtag notation (`thaiba:{tenant_id}:<key>`) in `redis-cluster-manager.ts` (`STREAM-003`), forcing all tenant keys to hash to the exact same cluster slot. Provide an `InMemoryStateAdapter` for single-node dev environments.

3. **SMS Notification Spikes & Provider Rate Limiting / Costs**
   - *Challenge:* High-volume event spikes (e.g. daily morning attendance batch) could overwhelm SMS gateway quotas or cause cost overruns.
   - *Mitigation:* Implement asynchronous notification dispatch queues with tenant-configurable rate limits (e.g. max 3 SMS per student per day) and priority deduplication in `automated-notification-router.ts` (`STREAM-007`).

4. **Predictive Retention Model Drift & Performance Overhead**
   - *Challenge:* Computing complex student retention scores across 50,000+ students across 23+ campuses could cause compute bottlenecks during web requests.
   - *Mitigation:* Use weighted logistic risk-scoring algorithms operating over indexed database metrics, cached window inference snapshots, and async batch evaluation in `student-retention-predictor.ts` (`STREAM-011`).

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule**, this contract was reviewed by **Qwen**, **OpenCode (Local-Ollama)**, and **Claude Code** for technical verification and refinement. The following recommendations were incorporated:

1. **Redis Hashtag Key Sharding & Cluster Slot Alignment (OpenCode / Ollama & Qwen):** Enforced strict Redis hashtag key syntax (`thaiba:{tenant_id}:*`) across all real-time stream buffers, circuit breaker states, and notification queues in `STREAM-003` to guarantee cluster hash slot alignment and prevent cross-slot execution errors in multi-region deployments.
2. **Dual-Channel Streaming with SSE Reconnect Fallback (Claude Code & Qwen):** Implemented a hybrid streaming engine (`STREAM-004`) featuring WebSockets for primary full-duplex communication and SSE with event ID sequence headers (`Last-Event-ID`) for robust fallback handling over proxy-restricted network environments.
3. **Automated Notification Router with Gateway Failover & Rate Limiting (OpenCode / Ollama):** Designed an asynchronous dispatch queue (`STREAM-007`) for SMS (via provider adapter with multi-gateway failover) and FCM/APNs push triggers for chronic absenteeism, featuring rate-limiting buckets to prevent notification fatigue and budget overruns.
4. **Fast Deterministic Matrix-Based "What-If" Budget Simulator (Claude Code):** Built a high-performance simulation engine (`STREAM-013`) utilizing linear matrix transformation math to evaluate multi-campus financial reallocations under 100ms SLA without blocking the Node.js event loop.
5. **Logistic Sigmoid Risk Scoring Engine for Retention (Qwen):** Developed student retention inference models (`STREAM-011`) combining weighted risk metrics (attendance < 75%, mark drops > 15%, fee defaults) with logistic sigmoid probability mapping to deliver normalized at-risk scores (0.00 to 1.00) with clear intervention suggestions.

---

## Scope & Out of Scope

### In Scope

1. **Database Schema & Permission Extensions:**
   - Drizzle ORM schemas for `realtime_stream_sessions`, `automated_trigger_rules`, `notification_dispatch_logs`, `student_retention_predictions`, `enrollment_forecasts`, and `budget_simulation_scenarios` in `packages/db/schema.ts` and `packages/db/schema.pg.ts`.
   - RBAC permissions in `@thaiba/auth`: `realtime:stream`, `triggers:manage`, `predictive:retention`, `simulation:budget`.

2. **Real-Time Streaming Core & Redis Cluster Scaling:**
   - Multi-region Redis Cluster key sharding manager (`redis-cluster-manager.ts`) with tenant hashtag tags (`thaiba:{tenant_id}:*`) and `InMemoryStateAdapter` fallback.
   - Dual-channel WebSocket and SSE real-time streaming infrastructure with sequence numbering and client heartbeat ping/pong (`realtime-streaming-service.ts`, `sse-handler.ts`).

3. **Automated Notification & Intervention Triggers:**
   - Automated event-driven trigger evaluation engine (`trigger-evaluation-engine.ts`).
   - Multi-channel notification router with SMS provider gateway adapter (Twilio/AWS SNS adapter) and FCM/APNs push router (`sms-gateway-adapter.ts`, `automated-notification-router.ts`).
   - Remediation trigger bridge connecting attendance/finance anomalies to auto-dispatched alerts (`remediation-trigger-bridge.ts`).

4. **Predictive Modeling & Scenario Simulation:**
   - Student retention prediction model using weighted logistic sigmoid risk scoring (`student-retention-predictor.ts`).
   - Multi-campus enrollment forecasting engine (`enrollment-forecasting-engine.ts`).
   - Interactive "What-If" budget scenario simulator using dynamic matrix reallocation math (`budget-scenario-simulator.ts`).

5. **API Endpoints & Administrative Workspaces:**
   - Streaming API handlers (`/api/admin/realtime/stream`, `/sse`, `/health`).
   - Trigger evaluation and dispatch API handlers (`/api/admin/triggers/evaluate`, `/dispatch`).
   - Predictive and simulation API handlers (`/api/admin/predictive/retention`, `/forecasting`, `/api/admin/simulation/budget`).
   - Web UI workspaces: Trigger Management (`/admin/triggers`), Predictive Retention (`/admin/predictive/retention`), Budget Scenario Simulator (`/admin/simulation/budget`), and Real-Time Streaming Governance (`/admin/realtime/governance`).

6. **Mobile Integration, Testing & Architecture Documentation:**
   - Mobile Flutter real-time stream receiver service and presentation screen (`realtime_stream_service.dart`, `realtime_copilot_screen.dart`, `/api/mobile/v1/realtime-stream`).
   - Multi-tenant security audit test suite (`realtime-security-audits.test.ts`).
   - End-to-end integration test suite & technical guide (`realtime-streaming-e2e.test.ts`, `docs/realtime-event-driven-streaming-guide.md`).

### Explicitly Out of Scope

- Hosting external custom Machine Learning model inference servers (e.g. PyTorch GPU clusters) outside Node.js / TypeScript environment.
- Automated execution of real-money bank wires or binding contractual commitments without human administrative approval.
- Third-party telecom SMS billing gateway creation (uses standard HTTP provider API wrappers).
- Direct modification of mobile app binary store native push notification certificates.

---

## Detailed Task Breakdown

### Phase 1: Real-Time Streaming Infrastructure & Redis Cluster Scaling Core

#### Task STREAM-001: Database Schema Extensions for Real-Time Streaming, Triggers, Predictive Models & Scenario Simulations
- **Description:** Extend dual-dialect Drizzle ORM schemas to define database tables for streaming sessions, automated trigger rules, notification dispatch logs, student retention predictions, enrollment forecasts, and budget scenario simulations.
- **Files:**
  - `packages/db/schema.ts` (SQLite dev schema)
  - `packages/db/schema.pg.ts` (PostgreSQL prod schema)
- **Dependencies:** None
- **Acceptance Criteria:**
  - Create tables: `realtime_stream_sessions`, `automated_trigger_rules`, `notification_dispatch_logs`, `student_retention_predictions`, `enrollment_forecasts`, `budget_simulation_scenarios`.
  - Include foreign key constraints to `institutions`, `users`, and `students` with `tenant_id` column.
  - Export types in `@thaiba/db` package without dialect errors.
- **Verification Method:** Run `pnpm check-types` across monorepo and verify schema compilation.
- **Estimated Complexity:** Low-Medium

#### Task STREAM-002: Validation Schemas & RBAC Permission Matrix Extensions for Real-Time Services
- **Description:** Implement Zod validation schemas for streaming parameters, trigger rule configurations, retention queries, and budget simulation parameters. Add new RBAC permissions to `@thaiba/auth`.
- **Files:**
  - `src/lib/validation/schemas.ts`
  - `packages/auth/roles.ts`
  - `src/lib/__tests__/realtime-validation.test.ts`
- **Dependencies:** STREAM-001
- **Acceptance Criteria:**
  - Add Zod schemas: `realtimeStreamQuerySchema`, `triggerRuleSchema`, `retentionPredictionQuerySchema`, `budgetSimulationSchema`.
  - Extend `@thaiba/auth` permissions: `realtime:stream`, `triggers:manage`, `predictive:retention`, `simulation:budget`.
  - Write unit tests in `realtime-validation.test.ts` confirming valid/invalid input validation and role mapping.
- **Verification Method:** Run `pnpm test src/lib/__tests__/realtime-validation.test.ts`.
- **Estimated Complexity:** Low-Medium

#### Task STREAM-003: Redis Cluster Key Sharding Manager & Multi-Region Health Monitor
- **Description:** Create a production-ready Redis Cluster manager with tenant hashtag key sharding (`thaiba:{tenant_id}:<key>`) to ensure cluster hash slot alignment and multi-node high availability with `InMemoryStateAdapter` fallback.
- **Files:**
  - `src/lib/redis/redis-cluster-manager.ts`
  - `src/lib/redis/redis-cluster-client.ts`
- **Dependencies:** STREAM-001
- **Acceptance Criteria:**
  - Enforce hashtag key formatting `thaiba:{tenant_id}:<domain>:<key>` across all Redis write/read operations.
  - Implement automatic fallback to `InMemoryStateAdapter` when Redis cluster connection fails or is unconfigured.
  - Provide cluster health monitoring metrics (active nodes, slot distribution, memory usage, hit rate).
- **Verification Method:** Run unit test simulating Redis cluster connection failover to in-memory state adapter.
- **Estimated Complexity:** Medium

#### Task STREAM-004: Full-Duplex WebSocket & SSE Real-Time Streaming Service
- **Description:** Build a dual-channel real-time streaming engine supporting full-duplex WebSocket connections for live copilot feeds and Server-Sent Events (SSE) with sequence headers for fallback environments.
- **Files:**
  - `src/lib/realtime/realtime-streaming-service.ts`
  - `src/lib/realtime/sse-handler.ts`
- **Dependencies:** STREAM-002, STREAM-003
- **Acceptance Criteria:**
  - Support event subscription channels: `copilot_feed`, `agent_logs`, `risk_alerts`, `system_health`.
  - Include client heartbeat ping/pong (15s interval) and automatic client connection cleanup.
  - Implement event sequence numbering (`event_id`) and message replay buffer for client reconnects.
  - Support fallback to SSE handler when client HTTP connection header requests `text/event-stream`.
- **Verification Method:** Unit test streaming connection initialization, message push, and SSE replay logic.
- **Estimated Complexity:** High

#### Task STREAM-005: Real-Time Streaming API Route Handlers & Health Endpoints
- **Description:** Implement Next.js API route handlers for WebSocket streaming upgrade, SSE event stream subscriptions, and real-time streaming cluster health checks.
- **Files:**
  - `src/app/api/admin/realtime/stream/route.ts`
  - `src/app/api/admin/realtime/sse/route.ts`
  - `src/app/api/admin/realtime/health/route.ts`
- **Dependencies:** STREAM-004
- **Acceptance Criteria:**
  - Secure API endpoints using `requireAuth(handler, "realtime:stream")`.
  - Handshake and establish SSE event stream headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`).
  - Return `{ status: "ok", active_connections: number, cluster_nodes: number }` on health endpoint.
- **Verification Method:** Execute HTTP GET/POST requests against SSE and health route handlers.
- **Estimated Complexity:** Medium

---

### Phase 2: Automated Notification & Intervention Triggers

#### Task STREAM-006: Automated Intervention & Trigger Evaluation Engine
- **Description:** Implement an event-driven trigger evaluation engine that monitors institutional events (e.g. chronic absenteeism, fee default risk, academic drops) and matches them against configurable tenant trigger rules.
- **Files:**
  - `src/lib/triggers/trigger-evaluation-engine.ts`
- **Dependencies:** STREAM-001, STREAM-002
- **Acceptance Criteria:**
  - Evaluate event payload against active rules in `automated_trigger_rules`.
  - Support rule condition operators: `>`, `<`, `=`, `IN`, `CONTAINS`.
  - Return structured trigger evaluation output: `{ rule_id, trigger_action, recipient_group, priority, payload }`.
- **Verification Method:** Unit test rule evaluation logic against sample attendance and financial event payloads.
- **Estimated Complexity:** Medium

#### Task STREAM-007: SMS Provider Gateway Adapter & Push Router Engine
- **Description:** Implement a multi-channel notification dispatch router with an abstract SMS provider adapter (supporting Twilio/AWS SNS HTTP API formats) and push notification dispatch with rate-limiting buckets.
- **Files:**
  - `src/lib/notifications/sms-gateway-adapter.ts`
  - `src/lib/notifications/automated-notification-router.ts`
- **Dependencies:** STREAM-006
- **Acceptance Criteria:**
  - Formulate SMS payload format with tenant branding and opt-out text.
  - Implement tenant rate limiting (e.g. max 3 SMS per recipient per 24 hours) via Redis token bucket.
  - Log all dispatches into `notification_dispatch_logs` with status `DELIVERED`, `FAILED`, or `RATE_LIMITED`.
  - Support fallback to push router when SMS provider fails or rate limit is reached.
- **Verification Method:** Run unit tests mocking SMS provider responses and testing rate-limit bucket throttling.
- **Estimated Complexity:** Medium-High

#### Task STREAM-008: Automated Absenteeism & Compliance Trigger API Endpoints
- **Description:** Create API route handlers to receive trigger evaluation requests, trigger rule management, and notification dispatch logs.
- **Files:**
  - `src/app/api/admin/triggers/evaluate/route.ts`
  - `src/app/api/admin/triggers/dispatch/route.ts`
- **Dependencies:** STREAM-007
- **Acceptance Criteria:**
  - Protect endpoints with `requireAuth(handler, "triggers:manage")`.
  - Support POST for manual trigger evaluation or webhook event injection.
  - Return HTTP 200 with dispatch status summary `{ evaluated: number, dispatched: number, skipped: number }`.
- **Verification Method:** Perform API test suite execution on trigger evaluation and dispatch handlers.
- **Estimated Complexity:** Medium

#### Task STREAM-009: Automated Risk & Intervention Dispatch Bridge
- **Description:** Build a integration bridge connecting Sprint-010 autonomous self-healing triggers and Sprint-011 copilot recommendations to the real-time event streaming and notification router.
- **Files:**
  - `src/lib/triggers/remediation-trigger-bridge.ts`
- **Dependencies:** STREAM-006, STREAM-007
- **Acceptance Criteria:**
  - Automatically evaluate high-risk student absenteeism alerts (>3 consecutive unexcused days) and dispatch SMS/Push alerts to parents and HODs within <30 seconds.
  - Convert copilot high-confidence risk alerts into automated trigger evaluation payloads.
  - Record audit trail linking trigger execution back to source anomaly ID.
- **Verification Method:** Unit test end-to-end event bridge flow from anomaly detection to notification dispatch log entry.
- **Estimated Complexity:** Medium

#### Task STREAM-010: Automated Trigger Management & Audit UI
- **Description:** Create a Web UI workspace for institutional administrators to configure automated trigger rules, define notification templates, set rate limits, and inspect dispatch audit logs.
- **Files:**
  - `src/app/(shell)/admin/triggers/page.tsx`
  - `src/components/triggers/trigger-rules-table.tsx`
- **Dependencies:** STREAM-008, STREAM-009
- **Acceptance Criteria:**
  - Use UI components from `src/components/ui/` (`<Button>`, `<Dialog>`, `<Badge>`, `<Skeleton>`).
  - Display active trigger rules with toggle switches, trigger counts, and success rates.
  - Provide rule creation/editing modal with condition builder and notification channel selection.
  - Always handle loading states with `<Skeleton>` and catch fetch errors with `<Alert>`.
- **Verification Method:** Verify page render in browser and test modal rule creation flow.
- **Estimated Complexity:** Medium

---

### Phase 3: Predictive Modeling & "What-If" Budget Scenario Simulation

#### Task STREAM-011: Predictive Student Retention Inference Engine
- **Description:** Implement a student retention prediction engine using a weighted logistic sigmoid risk-scoring algorithm combining attendance rates, academic grade drops, fee default history, and behavior metrics into a normalized at-risk score (0.00 to 1.00).
- **Files:**
  - `src/lib/predictive/student-retention-predictor.ts`
- **Dependencies:** STREAM-001, STREAM-002
- **Acceptance Criteria:**
  - Compute individual student retention risk score: $P(\text{Retention Risk}) = \frac{1}{1 + e^{-z}}$, where $z = w_1(\text{absenteeism}) + w_2(\text{grade\_drop}) + w_3(\text{fee\_delay})$.
  - Categorize risk levels: `LOW` (<0.30), `MODERATE` (0.30–0.69), `HIGH` (>=0.70).
  - Provide specific intervention recommendations for `HIGH` risk students (e.g. academic counseling, fee structure review).
- **Verification Method:** Unit test prediction calculations with historical student test dataset.
- **Estimated Complexity:** Medium-High

#### Task STREAM-012: Multi-Campus Enrollment & Resource Forecasting Engine
- **Description:** Build a multi-campus enrollment and resource forecasting engine utilizing linear trend projection and seasonal adjustment to project student enrollment, staff workload, and classroom capacity across campuses for upcoming academic terms.
- **Files:**
  - `src/lib/predictive/enrollment-forecasting-engine.ts`
- **Dependencies:** STREAM-011
- **Acceptance Criteria:**
  - Generate 12-month enrollment projections broken down by campus, department, and program.
  - Calculate required resource ratios (student-to-teacher ratio, facility utilization percentage).
  - Highlight campuses facing capacity bottlenecks (>90% utilization forecast).
- **Verification Method:** Verify forecasting output structure against mock multi-campus historical enrollment data.
- **Estimated Complexity:** Medium

#### Task STREAM-013: Interactive "What-If" Budget Scenario Simulation Engine
- **Description:** Build a fast, deterministic budget scenario simulator using linear matrix transformation math to model resource reallocation scenarios (e.g. staff salary adjustments, facility expansion, scholarship funding shift) and output projected financial impacts under 100ms SLA.
- **Files:**
  - `src/lib/simulation/budget-scenario-simulator.ts`
- **Dependencies:** STREAM-001, STREAM-002
- **Acceptance Criteria:**
  - Support parameter variables: `staff_cost_delta`, `tuition_fee_delta`, `facility_budget_delta`, `scholarship_allocation_delta`.
  - Compute matrix transformation: Projected Revenue, Projected Expenses, Net Operating Margin, Variance % vs Baseline.
  - Execution time must be <100ms for 25-campus simulation models.
- **Verification Method:** Unit test matrix calculations and benchmark execution speed over multi-campus datasets.
- **Estimated Complexity:** High

#### Task STREAM-014: Predictive Analytics & Scenario Simulation API Handlers
- **Description:** Create API route handlers for requesting student retention predictions, multi-campus enrollment forecasts, and budget scenario simulations.
- **Files:**
  - `src/app/api/admin/predictive/retention/route.ts`
  - `src/app/api/admin/predictive/forecasting/route.ts`
  - `src/app/api/admin/simulation/budget/route.ts`
- **Dependencies:** STREAM-011, STREAM-012, STREAM-013
- **Acceptance Criteria:**
  - Protect API routes with `requireAuth(handler, "predictive:retention")` or `requireAuth(handler, "simulation:budget")`.
  - Support GET with query parameters and POST with Zod-validated simulation body.
  - Return JSON responses with calculated metrics, risk categories, and scenario impact vectors.
- **Verification Method:** Execute unit test suite covering API route handlers with valid/invalid payloads.
- **Estimated Complexity:** Medium

#### Task STREAM-015: Predictive Retention & Multi-Campus Forecasting Center (Web UI)
- **Description:** Build a Web UI workspace for viewing student retention risk distributions, filtering at-risk students, and viewing 12-month enrollment forecasts across campuses.
- **Files:**
  - `src/app/(shell)/admin/predictive/retention/page.tsx`
  - `src/components/predictive/retention-dashboard.tsx`
- **Dependencies:** STREAM-014
- **Acceptance Criteria:**
  - Use Radix UI primitives and `<Badge variant="...">` for risk categories (`HIGH`: destructive, `MODERATE`: warning, `LOW`: success).
  - Interactive filters by campus, department, and risk level.
  - Include `<Skeleton>` loading states and `.catch()` error handling on all data fetches.
- **Verification Method:** Verify UI layout, risk badge variants, and interactive filtering in browser.
- **Estimated Complexity:** Medium-High

---

### Phase 4: Web Workspaces, Mobile Receiver, Verification & Documentation

#### Task STREAM-016: Interactive "What-If" Budget Scenario Simulator Workspace (Web UI)
- **Description:** Create an interactive drag-and-drop budget scenario simulator workspace enabling administrators to adjust budget sliders and visualize real-time projected financial impacts, operating margins, and variance charts.
- **Files:**
  - `src/app/(shell)/admin/simulation/budget/page.tsx`
  - `src/components/simulation/budget-simulator-workspace.tsx`
- **Dependencies:** STREAM-014, STREAM-015
- **Acceptance Criteria:**
  - Provide interactive sliders and input fields for key budget variables.
  - Instantly recalculate financial impact via API/client simulation logic within <200ms of user input change.
  - Include comparison view between baseline budget and simulated scenario.
  - Use UI components from `src/components/ui/` and standard CSS styling.
- **Verification Method:** Test slider interactions and scenario recalculation responsiveness in browser.
- **Estimated Complexity:** High

#### Task STREAM-017: Real-Time Copilot Stream & Redis Cluster Governance Center (Web UI)
- **Description:** Build an administrative governance hub for monitoring active WebSocket/SSE real-time streaming connections, inspecting live copilot feed events, and viewing Redis Cluster health and key sharding metrics.
- **Files:**
  - `src/app/(shell)/admin/realtime/governance/page.tsx`
  - `src/components/realtime/realtime-stream-workspace.tsx`
- **Dependencies:** STREAM-005, STREAM-016
- **Acceptance Criteria:**
  - Live stream event log viewer displaying incoming WebSocket/SSE event frames.
  - Display active Redis Cluster node status, memory usage, hit rate, and tenant key slot distribution.
  - Allow manual connection termination or channel broadcast for administrative announcements.
- **Verification Method:** Verify real-time event feed rendering and Redis cluster metric displays in browser.
- **Estimated Complexity:** Medium-High

#### Task STREAM-018: Mobile Real-Time Copilot Stream & SMS/Push Notification Receiver (Flutter)
- **Description:** Implement a mobile Flutter Riverpod service and UI screen to subscribe to real-time copilot stream events and display automated intervention notifications on mobile devices.
- **Files:**
  - `mobile/lib/features/copilots/services/realtime_stream_service.dart`
  - `mobile/lib/features/copilots/presentation/screens/realtime_copilot_screen.dart`
  - `src/app/api/mobile/v1/realtime-stream/route.ts`
- **Dependencies:** STREAM-005, STREAM-007
- **Acceptance Criteria:**
  - Implement Riverpod `StreamProvider` connecting to SSE/WebSocket backend endpoint using JWT authentication.
  - Display real-time copilot insights and automated absenteeism notifications with pull-to-refresh.
  - Handle connection drops gracefully with auto-reconnect logic.
- **Verification Method:** Run Flutter static analysis (`flutter analyze`) and test mobile SSE stream connection handler.
- **Estimated Complexity:** Medium-High

#### Task STREAM-019: Multi-Tenant Real-Time Security & Redis Cluster Key Sharding Test Suite
- **Description:** Create a comprehensive security and isolation test suite verifying multi-tenant WebSocket isolation, SSE stream authorization, Redis hashtag key namespacing, and SMS rate-limiting controls.
- **Files:**
  - `src/lib/__tests__/realtime-security-audits.test.ts`
- **Dependencies:** STREAM-005, STREAM-008, STREAM-014
- **Acceptance Criteria:**
  - Verify tenant A cannot subscribe to or view tenant B's WebSocket/SSE real-time stream.
  - Verify Redis keys strictly enforce hashtag format `thaiba:{tenant_id}:*`.
  - Verify API endpoints reject unauthorized tokens lacking RBAC permissions.
  - Verify SMS dispatch rate-limiter prevents excessive notifications.
- **Verification Method:** Run `pnpm test src/lib/__tests__/realtime-security-audits.test.ts` and verify 100% pass rate.
- **Estimated Complexity:** Medium-High

#### Task STREAM-020: End-to-End Real-Time Event-Driven Streaming Test Suite & Architecture Guide
- **Description:** Build an end-to-end integration test suite covering the entire real-time streaming, trigger evaluation, predictive retention, and scenario simulation lifecycle. Write a technical architecture guide in `docs/`.
- **Files:**
  - `src/lib/__tests__/realtime-streaming-e2e.test.ts`
  - `docs/realtime-event-driven-streaming-guide.md`
- **Dependencies:** STREAM-001 through STREAM-019
- **Acceptance Criteria:**
  - E2E test covers: trigger evaluation -> SMS/push dispatch -> WebSocket event stream push -> retention prediction -> budget simulation execution.
  - All test assertions pass with zero failures.
  - `docs/realtime-event-driven-streaming-guide.md` provides architectural documentation, API specifications, sequence diagrams, and Redis Cluster configuration guidelines.
- **Verification Method:** Run `pnpm test src/lib/__tests__/realtime-streaming-e2e.test.ts` and verify documentation accuracy.
- **Estimated Complexity:** Medium-High

---

## Task Matrix & Dependencies

| Task ID | Description | Primary Files | Dependencies | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **STREAM-001** | Database Schema Extensions | `packages/db/schema.ts`, `schema.pg.ts` | None | Low-Med |
| **STREAM-002** | Validation & RBAC Permissions | `schemas.ts`, `roles.ts`, `realtime-validation.test.ts` | STREAM-001 | Low-Med |
| **STREAM-003** | Redis Cluster Key Sharding Manager | `redis-cluster-manager.ts`, `redis-cluster-client.ts` | STREAM-001 | Medium |
| **STREAM-004** | Dual-Channel Streaming Service | `realtime-streaming-service.ts`, `sse-handler.ts` | STREAM-002, STREAM-003 | High |
| **STREAM-005** | Streaming API Route Handlers | `/api/admin/realtime/stream`, `/sse`, `/health` | STREAM-004 | Medium |
| **STREAM-006** | Trigger Evaluation Engine | `trigger-evaluation-engine.ts` | STREAM-001, STREAM-002 | Medium |
| **STREAM-007** | SMS Gateway & Push Router | `sms-gateway-adapter.ts`, `automated-notification-router.ts` | STREAM-006 | Med-High |
| **STREAM-008** | Trigger Evaluation & Dispatch APIs | `/api/admin/triggers/evaluate`, `/dispatch` | STREAM-007 | Medium |
| **STREAM-009** | Remediation Trigger Bridge | `remediation-trigger-bridge.ts` | STREAM-006, STREAM-007 | Medium |
| **STREAM-010** | Automated Trigger Management UI | `/admin/triggers/page.tsx`, `trigger-rules-table.tsx` | STREAM-008, STREAM-009 | Medium |
| **STREAM-011** | Predictive Retention Engine | `student-retention-predictor.ts` | STREAM-001, STREAM-002 | Med-High |
| **STREAM-012** | Enrollment & Resource Forecasting | `enrollment-forecasting-engine.ts` | STREAM-011 | Medium |
| **STREAM-013** | Budget Scenario Simulator Engine | `budget-scenario-simulator.ts` | STREAM-001, STREAM-002 | High |
| **STREAM-014** | Predictive & Simulation APIs | `/api/admin/predictive/*`, `/api/admin/simulation/*` | STREAM-011, 012, 013 | Medium |
| **STREAM-015** | Predictive Retention Center UI | `/admin/predictive/retention/page.tsx`, `retention-dashboard.tsx` | STREAM-014 | Med-High |
| **STREAM-016** | Budget Scenario Simulator UI | `/admin/simulation/budget/page.tsx`, `budget-simulator-workspace.tsx` | STREAM-014, STREAM-015 | High |
| **STREAM-017** | Real-Time Streaming Governance UI | `/admin/realtime/governance/page.tsx`, `realtime-stream-workspace.tsx` | STREAM-005, STREAM-016 | Med-High |
| **STREAM-018** | Mobile Stream & Notification Receiver | `realtime_stream_service.dart`, `realtime_copilot_screen.dart` | STREAM-005, STREAM-007 | Med-High |
| **STREAM-019** | Real-Time Security Test Suite | `realtime-security-audits.test.ts` | STREAM-005, 008, 014 | Med-High |
| **STREAM-020** | E2E Integration Suite & Architecture Guide | `realtime-streaming-e2e.test.ts`, `docs/realtime-event-driven-streaming-guide.md` | STREAM-001..STREAM-019 | Med-High |

---

## Risks & Mitigation Strategies

| Risk Description | Severity | Impact Area | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **1. WebSocket Drop in Proxy Networks** | Medium-High | Real-Time Streaming | Provide dual-channel SSE fallback (`sse-handler.ts`) with automatic sequence reconnection headers (`Last-Event-ID`). |
| **2. Redis Cluster Cross-Slot Errors** | High | Redis Infrastructure | Enforce strict hashtag notation (`thaiba:{tenant_id}:*`) in `redis-cluster-manager.ts` to map tenant keys to identical hash slots. |
| **3. SMS Provider Outages or Cost Spikes** | Medium | Automated Triggers | Implement SMS rate-limiting token buckets and automatic push notification failover router (`automated-notification-router.ts`). |
| **4. Retention Predictor Computational Latency** | Medium | Analytics Performance | Pre-calculate retention metrics into cached snapshot tables and execute risk scoring asynchronously over indexed columns. |
| **5. Scenario Simulator Matrix Complexity** | Low-Medium | Simulation UI | Use optimized linear matrix array math in `budget-scenario-simulator.ts` to execute scenario recalculations in <100ms. |

---

## Rollback Plan

In the event of critical failures during deployment or verification:

1. **Feature Flag Isolation:** All real-time streaming, automated notification dispatches, predictive retention calculations, and budget scenario simulations will be wrapped in feature flags (`NEXT_PUBLIC_ENABLE_REALTIME_STREAMING`, `ENABLE_AUTOMATED_SMS_TRIGGERS`). Disabling flags reverts platform behavior to standard Sprint-011 HTTP polling and manual alerts without downtime.
2. **Database Migration Reversion:** Schema changes in `packages/db/schema.ts` and `packages/db/schema.pg.ts` are strictly additive. Database rollback requires executing down-migrations or dropping newly created tables (`realtime_stream_sessions`, `automated_trigger_rules`, `notification_dispatch_logs`, `student_retention_predictions`, `enrollment_forecasts`, `budget_simulation_scenarios`). Existing core ERP tables remain completely unaffected.
3. **Redis Cluster Fallback:** If multi-region Redis Cluster node sharding encounters connectivity errors, `redis-cluster-manager.ts` automatically degrades to `InMemoryStateAdapter`, ensuring uninterrupted single-node operation.
4. **Git Branch Reversion:** Revert the `feature/sprint-012-realtime-streaming` branch merge commit to revert code to certified v2.3.0 baseline state.

---

## Definition of Done (DoD)

A task or sprint deliverable is defined as **DONE** only when all of the following criteria are satisfied:

1. **Implementation Completeness:** All 20 tasks specified in this engineering contract are fully implemented in code without missing functions or placeholder mocks.
2. **TypeScript & Build Standards:** TypeScript compilation (`pnpm check-types` / `tsc --noEmit`) completes with **0 errors**. Codebase build (`pnpm build`) completes with **0 errors**.
3. **Linting Standards:** Code follows all ThaibaHive coding conventions. ESLint runs with **0 errors**.
4. **Test Suite Certification:** All existing test suites (121+) and new Sprint-012 test suites (`realtime-validation.test.ts`, `realtime-security-audits.test.ts`, `realtime-streaming-e2e.test.ts`) pass with **100% pass rate** (target: 135+ test suites, 570+ passing tests).
5. **Security & Multi-Tenant Isolation:** Security verification confirms 100% multi-tenant isolation across WebSocket/SSE connections, Redis hashtag keys (`thaiba:{tenant_id}:*`), and RBAC permission checks.
6. **Performance SLAs:** WebSocket/SSE latency <500ms, Redis cluster key lookup <10ms, budget scenario simulation <100ms SLA.
7. **Mobile Verification:** Flutter static analysis (`flutter analyze`) completes with 0 warnings/errors for the mobile copilot real-time receiver.
8. **Documentation & Execution Log:** Execution log saved to `.ai/execution/Sprint-012-Execution-Log.md`. Architecture guide saved to `docs/realtime-event-driven-streaming-guide.md`. AIOS documentation (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`) updated.
