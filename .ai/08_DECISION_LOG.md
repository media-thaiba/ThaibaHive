# 08_DECISION_LOG.md — Architectural Decision Records (ADRs)

> **Classification**: Formal Architectural Decision Log  
> **Source of Truth**: `.ai/08_DECISION_LOG.md`

---

## ADR-001: Institution Scoping Strategy

* **Context & Problem**: ThaibaHive operates across 23+ campuses. We must decide how data multi-tenancy and isolation are enforced across different physical institutions.
* **Options Considered**:
  1. *Database per institution*: Separate SQLite/PG database per campus.
  2. *Schema per institution*: Separate PostgreSQL schema per campus.
  3. *Row-level institutionId scoping (Chosen)*: Single shared database with mandatory `institutionId` non-null foreign key on all operational tables.
* **Decision**: Adopt Option 3 (Row-level `institutionId` scoping).
* **Reason**: Enables multi-institution analytics, seamless staff/student inter-campus transfers, and shared central management without operational overhead of managing 23 separate database instances.
* **Consequences**: Every single query and API handler MUST explicitly filter by `institutionId`.

---

## ADR-002: Universal Shared Identity Model

* **Context & Problem**: How to model human beings who have multiple overlapping roles across campus (e.g., a student who is a hostel boarder, bus passenger, and library borrower).
* **Options Considered**:
  1. *Separate identity tables per module*: Standalone `hostel_students`, `bus_passengers`, `library_members` tables storing duplicated personal info.
  2. *Single Master Identity + Extension Tables (Chosen)*: Maintain canonical master records (`students`, `staff`, `guardians`) and attach 1:1 or M:N extension records (`student_guardians`, `hostel_allocations`, `transport_passengers`).
* **Decision**: Adopt Option 2.
* **Reason**: Guarantees zero data duplication, single biometric registration per individual, and complete entity lifecycle timelines.
* **Consequences**: Requires joining extension tables when querying module-specific attributes.

---

## ADR-003: Marketplace & App Registry Architecture

* **Context & Problem**: Different institution types require different feature subsets (e.g., hostels need outpass management, day schools do not).
* **Options Considered**:
  1. *Hardcoded feature flags in code*: Using `if (campus.isHostel)` branches throughout components.
  2. *Marketplace App Registry (`marketplace_apps`, `user_app_assignments`) (Chosen)*: Dynamic application enablement where departments or institutions activate modular apps.
* **Decision**: Adopt Option 2.
* **Reason**: Allows clean feature toggling per department/institution and supports third-party or optional module enablement without code clutter.
* **Consequences**: UI components must verify app enablement status before rendering module links.

---

## ADR-004: ERP Monorepo Namespace Isolation

* **Context & Problem**: How to integrate the 17 business domains of the ERP into the existing codebase without colliding with existing API routes or UI screens.
* **Options Considered**:
  1. *Separate ERP repository*: Building a separate app and connecting via REST APIs.
  2. *Route group `(erp)` and API namespace `/api/erp/` (Chosen)*: Co-locating ERP code within the existing Next.js App Router workspace.
* **Decision**: Adopt Option 2.
* **Reason**: Maximizes code reuse (`@thaiba/auth`, `@thaiba/db`, UI primitives), avoids double authentication, and eliminates cross-app network latency.
* **Consequences**: Requires strict folder structure conventions (`src/app/(shell)/(erp)/` and `src/app/api/erp/`).

---

## ADR-005: Student Master Data Authority

* **Context & Problem**: Establishing the canonical source of truth for student identity, admission data, and biometric templates.
* **Options Considered**:
  1. *Spread data across academic, fee, and hostel tables*.
  2. *Centralize master identity in `students` table (Chosen)*.
* **Decision**: Adopt Option 2. `students` table is the sole authoritative record for student identity.
* **Reason**: All ERP modules (Fees, Transport, Hostel, Exams) must reference `students.id` to ensure consistency.
* **Consequences**: Changes to core student fields must be handled via validated PATCH endpoints on `/api/academic/students/[id]`.

---

## ADR-006: Staff Master & Single Permission Matrix

* **Context & Problem**: Managing employee access across various administrative, teaching, and financial operations.
* **Options Considered**:
  1. *Multiple role strings per user*.
  2. *Single primary role string (`staff.role`) + Permission String Matrix in `@thaiba/auth` (Chosen)*.
* **Decision**: Adopt Option 2.
* **Reason**: Simplifies JWT token payloads and provides fine-grained access control (`domain:action`) evaluated via `hasPermission(role, permission)`.
* **Consequences**: Adding new capabilities requires registering new permission strings in `packages/auth/roles.ts`.

---

## ADR-007: Multi-Channel Notification Dispatcher

* **Context & Problem**: Delivering real-time alerts across web browsers, native mobile apps, and email without tying business logic to specific providers.
* **Options Considered**:
  1. *Direct inline provider calls in API handlers*.
  2. *Unified Notification Service (`sendPush.ts`, `realtime.ts`, `email.ts`) (Chosen)*.
* **Decision**: Adopt Option 2.
* **Reason**: Decouples feature logic from delivery mechanisms; allows automatic fallback and dead-token pruning.
* **Consequences**: Business logic calls `sendPushNotificationToStaff()` or `broadcastDashboardEvent()`.

---

## ADR-008: Event-Driven Architecture & Ambient AI Engine

* **Context & Problem**: How the system processes background tasks, anomaly detection, and automated reminders without blocking web request threads.
* **Options Considered**:
  1. *Synchronous evaluation during HTTP requests*.
  2. *Asynchronous Event-Driven Architecture (Chosen)*.
* **Decision**: Adopt Option 2. State mutations emit domain events; the background AI engine and workflow monitors process these events asynchronously.
* **Reason**: Keeps API route responses fast (< 50ms) and enables proactive administrative intelligence.
* **Consequences**: Requires background task management (`schedule`, background job queues).

---

## ADR-009: Immutable Compliance Audit Logging

* **Context & Problem**: Meeting legal, financial, and institutional audit requirements for grade edits, financial receipts, and security grants.
* **Options Considered**:
  1. *Overwriting database records without history*.
  2. *Dual logging: `activity_logs` for UI timeline + `audit_log` for immutable JSON diffs (Chosen)*.
* **Decision**: Adopt Option 2.
* **Reason**: `activity_logs` provides lightweight timeline feeds; `audit_log` provides legal, non-repudiable proof of changes.
* **Consequences**: Write endpoints MUST log structured diff payloads to `audit_log`.

---

## ADR-010: AIOS 3.0 Permanent Knowledge Base

* **Context & Problem**: Maintaining architectural alignment across different AI development agents (Claude, Gemini, Antigravity, ChatGPT, Copilot) over long-term project lifecycles.
* **Options Considered**:
  1. *Relying on implicit model training data or fragmented chat history*.
  2. *Establishing an in-repository, authoritative `.ai/` Knowledge Base (Chosen)*.
* **Decision**: Adopt Option 2. The `.ai/` directory contains 9 structured markdown specifications defining vision, rules, schemas, coding standards, and decision logs.
* **Reason**: Guarantees zero architectural drift, enforces non-negotiable coding standards, and provides instant onboarding for any AI agent.
* **Consequences**: All AI agents MUST read `.ai/00_START_HERE.md` and adhere strictly to the 100 rules in `.ai/05_AI_RULES.md`.

---

## ADR-011: Role-Based Workspaces & Preference Profiles

* **Context & Problem**: Users currently navigate through a complex list of 60+ module navigation links. To provide a modern, intent-driven user experience, we must transition users into personalized role-based workspaces.
* **Options Considered**:
  1. *Hardcoded layouts in client code*: Statically render layouts for each role (Principal, Teacher, Cashier, Parent) directly in the UI.
  2. *Dynamic client-managed layouts in LocalStorage*: Allow client-side customization stored only in browser local storage.
  3. *Database-driven Preference Profiles (`workspace_preferences`) (Chosen)*: Maintain user-specific preferences inside a DB table that defines active widgets and grid layout arrangements, falling back to role-specific baseline presets.
* **Decision**: Adopt Option 3.
* **Reason**: Centralizes user settings, allows cross-device layout synchronicity (web and mobile), supports secure fallback options, and ensures layouts respect RBAC permissions dynamically.
* **Consequences**: Adding new dashboard metrics requires registering widgets in the layout library, mapping key schemas inside `workspace_preferences`, and managing preferences via API handlers.

---

## ADR-012: Materialized Aggregation Cache & Cron Scheduling

* **Context & Problem**: Running raw SQL count/sum operations dynamically on every load of executive dashboards causes high CPU usage and queries slow down linearly with data growth.
* **Options Considered**:
  1. *Realtime computation on page request*: Run Drizzle aggregates dynamically on every request.
  2. *Redis caching*: Cache response payloads in Redis.
  3. *Materialized SQLite database cache with manual background queue execution (Chosen)*: Store serialized payloads inside SQLite/PostgreSQL `workspace_analytics_cache` with a fallback calculator service and run scheduler sweeps via an in-memory queue to dispatch report updates.
* **Decision**: Adopt Option 3.
* **Reason**: SQLite cache ensures zero infrastructure dependencies (removing Redis requirement in local dev), maintains persistent analytical history, and decouples query latency from write operations.
* **Consequences**: API queries read from the cache table, falling back to dynamic recalculation and cache refresh on miss. Automated report generation runs asynchronously in background threads.

---

## ADR-013: Database-Backed Queue System with Optimistic Locking

* **Context & Problem**: Transitioning scheduled report compiler queue from volatile in-memory arrays to persistent storage for clustered production readiness.
* **Options Considered**:
  1. *Distributed database transaction locks*: Using serializable write transactions to count processing rows and lock next queue item. (Prone to `SQLITE_BUSY` database lock crashes).
  2. *Optimistic Locking with Conditional Updates (Chosen)*: Attempting atomic updates (`where status = 'queued'`) on selected rows and verifying row edit changes count.
* **Decision**: Adopt Option 2.
* **Reason**: Prevents double-processing race conditions across clustered horizontal application nodes, avoids database deadlocks/lock errors on SQLite, and guarantees atomicity.
* **Consequences**: Queue services query queued records and claim them using atomic conditional updates, executing the jobs asynchronously in separate background tasks.

---

## ADR-014: Asynchronous Relational Preferences Audit Logging

* **Context & Problem**: Auditing user widget personalization layout changes for security, troubleshooting, and compliance.
* **Options Considered**:
  1. *Console-based standard logs*: Logging updates via `console.log` statements. (Fragile, non-queryable, and transient).
  2. *Relational database logging with asynchronous execution (Chosen)*: Inserting JSON diff records into `preference_audit_log` database table asynchronously.
* **Decision**: Adopt Option 2.
* **Reason**: Relational audit log enables sub-second compliance audit reporting and queries, while asynchronous non-blocking promise loops ensure write database latency does not impact user-facing response times.
* **Consequences**: Preferences PUT endpoint queries the oldValue and writes audit records asynchronously in background promise executions. Pruning maintenance routine is provided to clean up logs older than 90 days.

---

## ADR-015: Administrative Job Management API

* **Context & Problem**: Administrators require control over database-backed queued compiler tasks (trigger, pause, resume, cancel) with proper RBAC constraints and audit logging.
* **Options Considered**:
  1. *Direct database CLI mutations*: Forcing operators to manually edit rows via terminal SQL. (Unsafe, un-audited, high risk).
  2. *REST API gated with Role-Based Access Control and Preference Auditing (Chosen)*: Exposing endpoints gated to `super_admin` role that validate input schemas, manage conditional status transitions, and log actions to the preference audit log.
* **Decision**: Adopt Option 2.
* **Reason**: Exposing secure REST endpoints ensures administrative operations are safe, validated by Zod schemas, and compliant with audit logging protocols by writing to `preference_audit_log`.
* **Consequences**: Manual enqueuing triggers a background processing cycle. Invalid state transitions (e.g. pausing an already processing task) are rejected.

---

## ADR-016: Swarm Queue Telemetry & Observability

* **Context & Problem**: Visibility is needed on background worker concurrency loads, backlog sizes, and failures without inducing CPU rendering overhead or database locking issues.
* **Options Considered**:
  1. *Constant client-side database polling*: UI requests state from database every 1 second. (Induces heavy query loads).
  2. *SSE Stream with EventBus integration & UI fallback polling (Chosen)*: Emitting worker events/metrics to an in-memory ring-buffer in EventBus, exposing sliding-window metrics with a 5-second cache, streaming via SSE, and using exponential reconnect backoff with 15-second database polling fallback in the UI.
* **Decision**: Adopt Option 2.
* **Reason**: Minimized database queries via the 5-second cache, real-time telemetry streaming via SSE, and UI fallback polling ensure absolute console resilience.
* **Consequences**: UI handles connection drops gracefully and continues to render concurrency gauges and glowing pipelines.


