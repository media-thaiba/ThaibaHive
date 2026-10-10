# Changelog

All notable changes to the **ThaibaHive** enterprise autonomous platform will be documented in this file.

## [3.37.0] - 2026-10-10
### Phase 8: AI Copilot V2 (Multimodal LLM & Autonomous Remediation)
#### Added
- **Multimodal Document Intelligence**: OCR + structured JSON extraction pipeline for fee receipts, medical certificates, student ID cards, CCTV frames, and administrative documents with deterministic multi-factor confidence scoring ($0.4 \times \text{Zod} + 0.3 \times \text{Rule} + 0.3 \times \text{OCR}$).
- **PII / FERPA / HIPAA DLP Sanitizer**: Automatic regex-based masking of Aadhaar, PAN, SSN, Credit Cards, and Phone numbers with local-first on-premise routing for sensitive medical records.
- **Voice Copilot V2 Audio Mesh**: 16kHz PCM audio stream parser with Root Mean Square (RMS) energy VAD, silence detection, native Web Speech API passthrough, STT/TTS synthesis with 4 voice profiles, and duplex turn endpoint (`/api/ai/copilot/voice/interact`).
- **Structure-Aware RAG Engine**: Markdown and table-aware document chunking (512 tokens, 50 overlap), dual-dialect hybrid vector search (PostgreSQL `pgvector` HNSW + SQLite in-memory cosine + BM25 keyword matching), and Reciprocal Rank Fusion (RRF $k=60$) with groundedness verification.
- **Autonomous Remediation Runtime & Typed Tools**: Multi-step saga engine with typed tool executors (`finance.*`, `leave.*`, `notification.*`, `rag.*`), human-in-the-loop (HITL) approval gates, D12 Step-Up authentication freshness enforcement ($\le 300\text{s}$), reverse-order compensating rollbacks, and real-time Merkle ledger flushing.
- **Cryptographic Merkle Audit Trail**: Verification endpoint (`/api/ai/audit/merkle`) and viewer guaranteeing sequential SHA-256 Merkle chain integrity across all AI tool invocations.
- **Web UI & Action Center Integration**: CommandPalette (`Cmd+K`) Voice Copilot trigger button with live audio visualization, ActionCenter Document Intelligence 3-tab upload & preview drawer, RAG policy search dialog, and HITL approval diff modal.
- **Dual-Dialect Database Parity**: 4 new tables (`ai_documents`, `ai_copilot_sessions`, `ai_rag_corpus`, `ai_token_budgets`) across SQLite and PostgreSQL with 100% dialect parity, tenant indexes, and migrations (`0034_complex_iron_monger.sql`, `0018_smooth_boom_boom.sql`).
- **Granular RBAC Matrix**: Fully mapped 11 new AI permissions across the 5-tier role hierarchy.

## [3.36.0] - 2026-10-09
### Phase 6: Real-Time Push & Bi-Directional Messaging Mesh
#### Added
- **Real-Time Mesh & WebSocket / SSE Transport**: Bi-directional in-memory Pub/Sub message broker with fallback SSE streaming (`/api/chat/sse`) and WebSocket transport (`/api/chat/ws`), heartbeat pings, presence tracking, and typing indicator broadcast debouncing.
- **Dual-Dialect Database Parity**: 4 new tables (`chat_channels`, `chat_members`, `chat_channel_messages`, `chat_receipts`) across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) with unique composite indexes and 100% dialect parity.
- **Chat REST API & Multi-Tenant RBAC Guardrails**: 6 secure API endpoints (`/api/chat/channels`, `[id]`, `[id]/members`, `[id]/messages`, `messages/[id]`, `messages/[id]/read`, `presence`) guarded by `requireAuth` with granular permissions (`chat:read`, `chat:write`, `chat:admin`), Zod schema validation, and tenant isolation enforcement.
- **FCM Multicast Engine & Smart Push Aggregator**: Firebase Cloud Messaging multi-device delivery with 30s notification aggregation buffer (coalescing burst messages into single summary notifications per channel) and universal deep link payload generation (`thaibahive://chat/:id`).
- **Web Chat Center (`Cmd+Shift+M`)**: Slide-out drawer modal (`<ChatDrawer>`), responsive channel list (`<ChannelList>`), message stream with read receipts (`<MessageThread>`, `<ReadReceiptBadge>`), auto-expanding input (`<MessageInput>`), top navbar trigger button with unread count badge, and `useChat` React hook with optimistic UI and auto-reconnect backoff.
- **Flutter Mobile Chat Module**: Riverpod-powered chat architecture (`chat_repository`, `chat_providers`), Hive local persistence & offline outbox (`chat_outbox`), integrated Step 3 drain in `SyncCoordinator`, `ChannelListScreen`, `ChatScreen`, and GoRouter navigation routes (`/chat`, `/chat/:id`).
- **Comprehensive Quality Gates**: 16/16 verification gates passed with 0 TypeScript errors, 0 ESLint errors, 792/792 Jest test suites (4,909 tests), 263/263 Flutter tests, 100% RBAC permission coverage, 100% naked handler coverage, and 100% cross-tenant isolation.

## [3.35.0] - 2026-10-09
### Phase 5: Global Search & Omnibox Command Center
#### Added
- **Global Search & Omnibox Command Center (`Cmd+K`)**: Unified cross-platform omnibox with instant fuzzy matching, multi-domain search across staff, students, tasks, circulars, media, and facilities.
- **SSE Live Suggestions**: Streaming search recommendations and keyword completions.
- **Mobile Search & Deep Link Navigation**: Flutter omnibox integration with GoRouter navigation.

## [3.34.0] - 2026-10-09
### Phase 4: Deep Links & Mobile Auth Handoff
#### Added
- **Stateless HMAC SHA-256 Nonce Exchange**: Single-use mobile-to-web session handoff with 60s validity and replay protection.
- **Universal Links & App Links**: `apple-app-site-association` and Android `assetlinks.json` verification.
- **WebView Handoff Screen**: Flutter WebView handoff component with secure cookie injection.

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
