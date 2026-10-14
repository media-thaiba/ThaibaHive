# Changelog

All notable changes to the **ThaibaHive** enterprise autonomous platform will be documented in this file.

## [3.41.0] - 2026-10-14
### Phase 12 (Track 3A): Unified Campus Identity (SAML/OIDC SSO) & Real-Time E2EE WebRTC Conferencing
#### Added
- **Hardened SAML 2.0 Engine & SP Metadata**: Enterprise identity federation engine with Exclusive XML Canonicalization (C14N `http://www.w3.org/2001/10/xml-exc-c14n#`), fail-closed XXE attack defense, RSA-SHA256/RSA-SHA1 digital signature validation, 600s bounded assertion replay cache, $\pm 300\text{s}$ clock skew verification, and standard SP metadata XML generation (`GET /api/auth/saml/metadata`).
- **Hardened OIDC Engine**: RFC 7636 PKCE S256 code challenge generation and validation, timing-safe HMAC-SHA256 CSRF state tokens, and cryptographic JWKS ID token validation via `jose`.
- **JIT User Provisioning & Escalation Guard**: Automated staff account provisioning with strict negative role boundary enforcement (unilaterally preventing external IdP assertions from escalating to `super_admin` or `system` by clamping to `admin` with security alerts), auto-association of `staffInstitutions` and `staffDepartments`, automated verified email timestamping (`emailVerifiedAt`), and regional mobile auth handoff.
- **Append-Only Merkle Audit Ledger**: Chained SHA-256 Merkle audit trail (`sso_audit_logs`) with sequential integrity verification (`SsoAuditLedger.verifyChain`) for all federated logins, test probes, and JIT provisioning events.
- **Real-Time WebRTC Conferencing & Perfect Negotiation**: WebRTC signaling manager with deterministic Perfect Negotiation politeness resolution, sequence-numbered message queuing in `conferenceSignals`, and dual transport via Server-Sent Events (`GET /api/streaming/rooms/[id]/events`) and HTTP POST (`POST /api/streaming/rooms/[id]/signal`). Includes RFC 5766 time-limited HMAC-SHA1 ephemeral TURN credentials with 24-hour expiration.
- **Room State Machine & Atomic Admission Gate**: Room manager enforcing transactional capacity gating (`maxParticipants`), SHA-256 hashed passcode protection, host moderation controls (kick participant, lock room, end meeting), and 30-second heartbeat orphan sweeper.
- **SFrame / Insertable Streams P-256 ECDH Key Agreement**: Per-room ephemeral ECDH key agreement with HKDF-SHA256 deriving 256-bit AES-GCM encryption keys and automated forward-secrecy epoch key rotation on participant join, departure, or eviction.
- **Web Admin & Operations Cockpits**: Campus Identity & SSO Federation cockpit (`/admin/sso`) with SAML/OIDC configuration, SP metadata XML export, and live diagnostic probe runner; Real-time conferencing room cockpit (`/operations/conferencing/[id]`) with video tile grid, media controls, E2EE verification fingerprint dialog, and SSE signaling integration.
- **Flutter Mobile Conferencing Companion**: Riverpod-managed `ConferenceRoomScreen` (`/conferencing/:id`) with on-device E2EE fingerprint modal, audio/video toggle controls, and seamless native auth handoff.
- **Dual-Dialect Database Parity & Migrations**: 8 new multi-tenant tables (`saml_providers`, `oidc_providers`, `streaming_rooms`, `streaming_sessions`, `stream_recordings`, `conference_signals`, `sso_audit_logs`, and extended `federated_identity_mappings`) across SQLite and PostgreSQL schemas with non-destructive migrations `0040_magical_vertigo.sql` and `0024_tranquil_proteus.sql`.
- **7-Key Granular RBAC Matrix & Feature Flags**: Added `sso:read`, `sso:manage`, `sso:test`, `conference:create`, `conference:join`, `conference:record`, and `conference:manage` across all 16 roles in `packages/auth/roles.ts`, protected by `sso_federation` and `webrtc_conferencing` feature flags.
- **8-Stage End-to-End Simulation CLI**: Verified 100% completion across all 8 zero-egress stages via `pnpm conference:simulate`.

## [3.40.0] - 2026-10-14
### Phase 11: Multi-Campus Federation & SIS/LMS Standards Sync
#### Added
- **SIS/LMS Standards Adapters & Sync Engine**: Automated roster synchronization supporting Ed-Fi Alliance v5.3 REST API (`api/v5.x/data/v1`), 1EdTech OneRoster 1.2 REST API, and standardized CSV S3/HTTPS ingest with differential record hashing and Change Data Capture (CDC) updates.
- **Idempotent Replay & Human Mapping Queue (Gate 9)**: Deterministic SHA-256 payload hashing (`RecordMapper.hashPayload`) guaranteeing zero duplicate row insertions on replayed sync runs; unmatched external identifiers automatically enqueued to `sis_mapping_queue` for manual triage with audit logs.
- **Standards OAuth2 Token Lifecycle (`token-lifecycle.ts`)**: Proactive TTL-aware token refresh manager targeting Ed-Fi and OneRoster OAuth2 endpoints with 300s clock-skew buffer, per-connector cache, and fail-closed exception handling.
- **SSRF Egress Defense & IP Pinning (Gate 11)**: Strict outbound egress guard (`EgressGuard`) rejecting cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`), private RFC 1918 CIDRs, loopbacks, and `.internal`/`.local` hostnames prior to and post-DNS resolution with pinned IP caching and per-hop redirect validation.
- **Webhook Ingress Security & Replay Prevention (Gates 12 & 18)**: High-security webhook ingress endpoint (`/api/sis/webhooks/[connectorId]`) with bounded raw body parsing, constant-time HMAC-SHA256 signature verification over `timestamp.body`, ±300s timestamp window, and 600s TTL per-connector nonce cache.
- **Cross-Campus Resource Pools & Double-Booking Conflict Defense (Gate 10)**: Regional shared resource pools (`resource_pools`) for research labs, auditoriums, exam venues, and transit fleets with atomic double-booking prevention via PostgreSQL `EXCLUDE USING gist` exclusion constraints and SQLite single-transaction interval overlap predicates, rejecting colliding requests with `409 Conflict`.
- **Allocation Merkle Ledger & Automated Expiry Sweeper (Gates 10 & 19)**: Append-only chained Merkle ledger (`cross_campus_allocations`) with cryptographic verification (`verifyAuditTrail`), and automated `ExpirySweeper` transitioning stale pending requests past `expiresAt` to `expired` with full audit entries.
- **Dual-Dialect Database Parity**: 8 new multi-tenant tables (`sis_connectors`, `sis_sync_runs`, `sis_sync_records`, `sis_mapping_queue`, `sis_sync_audit`, `resource_pools`, `cross_campus_bookings`, `cross_campus_allocations`) with 100% column parity across SQLite and PostgreSQL schemas and migrations (`0038_dashing_wildside.sql`, `0039_high_nightshade.sql` / `0022_oval_iron_fist.sql`, `0023_rich_lady_bullseye.sql`).
- **Web Admin Cockpits & Navigation**: Cockpits for SIS Standards (`/admin/sis`) and Cross-Campus Federation (`/admin/cross-campus`) with slot availability checker, booking request inbox, and bidirectional cross-link banner to Executive Regional Analytics (`/admin/regional-analytics`).
- **5-Tier Granular RBAC Matrix**: 7 new permission keys (`sis:read`, `sis:manage`, `sis:sync`, `sis:webhooks:manage`, `crosscampus:read`, `crosscampus:request`, `crosscampus:approve`) mapped across all 5 tiers and specialized roles, gated by `sis_sync` feature flag.
- **8-Stage End-to-End Simulation CLI**: Verified 100% completion across all 8 stages via `pnpm sis:simulate`.

## [3.39.0] - 2026-10-11
### Phase 10: Track 3B AI Agent Marketplace & Live Multimodal Streaming
#### Added
- **AI Agent Marketplace & Plugin Engine**: Multi-tenant agent plugin registry with deterministic canonical SHA-256 manifest hashing, public catalog browsing, and least-privilege installation (`grantedPermissions ⊆ manifest ∩ installerACL`). Includes reviews & star ratings engine (`agent_plugin_reviews`), scope isolation (`global` vs `institution_private` vs `institution_shared`), and super-admin approval boundary controls.
- **Egress-Controlled Plugin Sandbox**: Sandboxed execution runtime (`PluginSandbox`) with resource budgeting (timeout, memory, token ceiling), concurrency semaphores, and SSRF defense (blocking RFC 1918 private IPs, AWS cloud metadata `169.254.169.254`, loopback, and internal `.local`/`.internal` domains). Includes real-time Merkle audit logging.
- **Visual Workflow Studio (`/operations/workflow-studio`)**: ReactFlow canvas (`@xyflow/react`) for drag-and-drop workflow DAG construction, accessible keyboard palette, and bidirectional compiler (`graph-compiler.ts`) converting visual DAGs to cycle-free Kahn topologically sorted Workflow DSL with fingerprint verification. Includes immutable version history engine (`agent_workflow_graph_versions`).
- **Gemini Live Multimodal Adapter & Real-Time Engine**: High-frequency streaming adapter (`LiveSessionProvider`, `GeminiLiveProvider`, `MockLiveProvider`) consuming bidirectional PCM16 16kHz audio, Keyframe pipeline with drop-oldest bounded queuing (1 FPS), RMS energy VAD transcriber, and live hazard event dispatch over HTTP SSE duplex stream (`/api/live/sessions/[id]/stream`).
- **Institutional Quota & Concurrency Governance**: Tenant-level session quotas (3 concurrent sessions max, 120 minutes/day ceiling) with single-statement atomic usage counter increments and clean auto-termination timers.
- **Web Admin & Operations Cockpits**: Agent Marketplace console (`/admin/agent-marketplace`) with catalog grid, capability chips, review composer, and install dialog; Live Multimodal Operations console (`/operations/live-sessions`) with live event viewer, transcript log, and quota stat cards.
- **Mobile Agent Hub Companion Extensions (Flutter)**: Riverpod-powered plugins catalog, detail screen (`PluginDetailScreen`), enabled/quarantined toggle, live multimodal stream transcript/hazard cards (`LiveSnippetCard`), workflow run trigger dialog, and offline secure storage read caching.
- **Dual-Dialect Database Parity**: 7 new multi-tenant tables (`agent_plugins`, `agent_plugin_installations`, `agent_plugin_reviews`, `agent_workflow_graphs`, `agent_workflow_graph_versions`, `agent_live_sessions`, `agent_live_session_segments`) across SQLite and PostgreSQL schemas with migrations (`0036_flimsy_kitty_pryde.sql`, `0020_sad_turbo.sql`).
- **5-Tier Granular RBAC Matrix**: 10 new permission keys (`marketplace:browse`, `marketplace:install`, `marketplace:publish`, `marketplace:review`, `marketplace:admin`, `workflow_studio:view`, `workflow_studio:edit`, `workflow_studio:publish`, `live_stream:view`, `live_stream:operator`) mapped across all 5 tiers and specialized roles.
- **8-Stage End-to-End Simulation CLI**: Verified 100% completion via `pnpm marketplace:simulate`.

## [3.38.0] - 2026-10-10
### Phase 9: Track 3C Hardware Radar & IoT Mesh
#### Added
- **Fleet Management & Device Onboarding**: Micro-agent IoT orchestration for BLE beacons, gateways, environmental sensors, turnstiles, and cameras with X.509 mTLS and HMAC-SHA256 device authentication, and automated fleet anomaly detection (low battery, offline heartbeat timeouts, RF packet loss).
- **High-Volume Telemetry Ingestion & Firmware OTA**: In-memory buffered write-behind batch worker (`TelemetryIngestionWorker`) with sub-second flushing, and chunked SHA-256 signed firmware OTA staging state machine (`FirmwareOTAEngine`) with canary rollouts (1% → 10% → 100%) and automatic rollback watchdog.
- **Proximity Radar & Spatial Geofencing**: 2.4GHz BLE RSSI distance estimation via Log-Distance Path Loss model, 1D Kalman filter smoothing, Weighted Least Squares (WLS) multi-anchor trilateration, and Ray-Casting point-in-polygon algorithm for convex/concave campus boundaries and restricted security zones.
- **Dynamic Emergency Muster Headcount**: Real-time evacuation accounting engine (`MusterEngine`) tracking safe occupants inside assembly zones vs missing occupants, with evacuation percentage progress metrics.
- **Smart Turnstile Gate & 5-Tier Anti-Passback State Machine**: Sub-50ms transit verification engine (`GateAccessEngine`) with 5 APB modes (`hard`, `soft`, `timed`, `forgiving`, `disabled`), double-swipe jitter tolerance, and campus/zone emergency lockdown override.
- **Edge Biometric Mesh & Zeroization**: AES-256-GCM envelope encrypted biometric template storage, vector cosine similarity matching ($\ge 0.82$), replay-defense challenge nonces, differential delta sync for edge terminals, and GDPR Article 17 / FERPA cryptographic zeroization.
- **Web Command Center & Canvas Radar Map**: 60 FPS interactive visual radar canvas (`<CampusRadarMap>`), live gate monitoring console (`<GateMonitoringConsole>`), device fleet manager (`<DeviceFleetTable>`), and operations pages at `/operations/radar` and `/operations/hardware`.
- **Flutter Mobile Guard Patrol & Radar**: Riverpod-backed `GuardPatrolScreen` for NFC/QR checkpoint transit logging, offline outbox queuing, and `HardwareRadarScreen` with live muster evacuation widgets and 2D spatial blip visualization.
- **Dual-Dialect Database Parity**: 6 new tables (`hardware_devices`, `hardware_zones`, `hardware_badges`, `hardware_biometric_templates`, `hardware_access_events`, `hardware_telemetry_logs`) across SQLite and PostgreSQL schemas with unique indexes, foreign key cascades, and migrations (`0035_many_talkback.sql`, `0019_low_mystique.sql`).
- **5-Tier Granular RBAC Matrix**: 9 new hardware & radar permissions mapped across `super_admin`, `admin`, `principal`, `hod`, `staff`, `accounts`, `purchase`, `regional_admin`, and `regional_auditor`.
- **8-Stage End-to-End Simulation CLI**: Verified 100% completion via `pnpm hardware:simulate`.

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
