# Phase 10: AI Agent Marketplace & Live Multimodal Streaming (Track 3B) — Draft v2

**Milestone**: ThaibaHive v3.39.0 — Composable Agent Economy  
**Branch**: `feat/phase-10-agent-marketplace`  
**Base**: `master` @ `v3.38.0` (+ Production Deployment & Staging Soak)  
**Status**: Draft v2 — Security & Backend + Mobile/AI reviews incorporated (all HIGH findings resolved)

---

## 1. Executive Summary

Phase 10 turns the AIGENT-OS workflow engine (Sprint-100) into a **composable agent economy**: institutions discover, install, and chain vetted agent plugins through a visual studio, while operators open SSE-duplex Gemini Live sessions for real-time CCTV/audio analysis.

### Key Architectural Pillars:
1. **Multi-Tenant Plugin Marketplace** (`/api/agent-plugins/**`, UI `/admin/agent-marketplace`): semver registry, verified authors, admin approval gates, ratings — living beside (not colliding with) the existing App Marketplace; install/uninstall reuses `marketplace:install`/`marketplace:uninstall`.
2. **Escalation-Proof Sandboxed Execution**: `granted ⊆ manifest ∩ installer ACL`, privileged namespaces require approver re-grant, worker resource budgets (containment — not a security boundary), SSRF egress allowlist, synchronous Merkle audit of every lifecycle event and tool allow/deny.
3. **Visual Workflow Studio** (flag `workflow_studio`): `@xyflow/react` DAG canvas compiling to the existing `WorkflowDsl` — reuses Sprint-100 execution engine, HITL gates, and compensation logic unchanged.
4. **Gemini Live Sessions via SSE + POST** (flag `live_streaming`): platform-correct duplex transport, `LiveSessionProvider` interface with real Gemini WS provider + offline mock, 1 FPS keyframe ingest, VAD/streaming STT, quotas and bounded queues.
5. **Extended Surfaces**: `/operations/workflow-studio`, `/operations/live-sessions`, and the **existing** Flutter `features/agent_hub/` extended with plugin management and live snippets (streamed via existing `AgentStreamService`).

### Existing Foundation Reused (Do Not Rebuild)
| Asset | Location |
|---|---|
| Workflow tables + HITL gates | `agentic_workflows*`, `agent_approval_gates` |
| DSL parse/validate/engine | `src/lib/agents/workflow/{dsl,engine}/*` |
| Guardrails & audit | `src/lib/agents/guardrails/{merkle-ledger,policy-engine,kill-switch}.ts` |
| Gemini provider + mock pattern | `src/lib/ai/providers/gemini-provider.ts` (`!apiKey` mock path) |
| SSE plumbing | `src/app/api/vision/stream/route.ts`, `src/lib/realtime/sse-handler.ts` |
| WebRTC/media plumbing | `src/lib/streaming/{webrtc-signaling,media-session}.ts` |
| Mobile Agent Hub | `thaibahive_mobile_app/lib/features/agent_hub/` (+ `AgentStreamService`) |
| Hardware zones (camera binding) | `hardware_zones` (Phase 9) |

---

## 2. Execution Waves & Commits

### Wave 1: Database Schema, Parity Migrations & RBAC Matrix (Commit 1)
- Add `agent_plugins`, `agent_plugin_installations`, `agent_plugin_reviews`, `agent_workflow_graphs`, `agent_live_sessions`, `agent_live_session_segments` to `packages/db/schema.ts` and `packages/db/schema.pg.ts`.
- Unique indexes: `(plugin_key, version)`, `(institution_id, plugin_id)`, **`(institution_id, plugin_id, reviewer_user_id)`**, **`(institution_id, graph_name, graph_version)`**, `(session_id, sequence)`; **non-unique** `(institution_id, status)` on graphs and sessions.
- Nullable global `institution_id` on `agent_plugins` pre-registered in `scripts/security/tenant-scan-allowlist.json` with justification (Rule D).
- Generate both dialect migrations (`pnpm db:generate`, `pnpm db:generate:pg`).
- Map 10 new keys in `packages/auth/roles.ts` per SPEC's 15-role matrix; add `workflow_studio` and `live_streaming` flags to `src/lib/features.ts`.
- Tests: `packages/auth/__tests__/marketplace-rbac-matrix.test.ts` (positive **and deny cases**, incl. global-approval rule), `schema-drift.test.ts` parity.

### Wave 2: Marketplace Engine, Approval Pipeline & Sandboxed Execution (Commit 2)
- Build `MarketplaceEngine` (`src/lib/marketplace/plugin-engine.ts`): publish → pending_review → approve/reject → deprecate lifecycle; semver validation; `manifest_hash` recompute ⇒ auto re-review; **visibility rules** (global approved OR own-institution only); install/uninstall with **grant computation `manifest ∩ installer ACL` + privileged-namespace approver gate**; rating rollup via **single-statement SQL aggregates inside a transaction** (concurrent-review safe).
- Build `PluginSandbox` (`src/lib/marketplace/plugin-sandbox.ts`): manifest validation, worker-thread execution with `resourceLimits` + wall-clock timeout + output cap + **global concurrency semaphore**, **egress allowlist validator** (HTTPS + DNS-resolved IP range rejection), and **synchronous** Merkle logging of allow/deny.
- API routes (all `requireAuth` + Zod + `runtime = "nodejs"` + feature-flag gate `marketplace`):
  - `GET/POST /api/agent-plugins`, `GET /api/agent-plugins/[id]`
  - `POST /api/agent-plugins/[id]/install`; **`DELETE /api/agent-plugins/[id]/install` (404 when not installed)**
  - `POST /api/agent-plugins/[id]/approve` (global listing ⇒ super_admin/system only)
  - `POST /api/agent-plugins/[id]/reviews`, `GET /api/agent-plugins/installations`
- Lifecycle audit events (`marketplace:publish|approve|reject|install|uninstall|review`) written with **synchronous ledger flush**.
- Zod schemas in `src/lib/validation/schemas.ts`.
- Tests: `src/lib/marketplace/__tests__/{plugin-engine,plugin-sandbox}.test.ts` — incl. escalation ⇒ 403, SSRF URL ⇒ failure, timeout kill, manifest-tamper ⇒ re-review, concurrent ratings.

### Wave 3: Visual Workflow Studio & DAG→DSL Compiler (Commit 3, flag `workflow_studio`)
- Add `@xyflow/react`; build studio as **`"use client"` wrapper** loading ReactFlow via `next/dynamic` (`ssr: false`) inside a client component; explicit-height container (`h-[calc(100vh-var(--header-h))]`) + `@xyflow/react` stylesheet import; node palette (trigger/agent step/condition/HITL gate/hardware action/notification), edge rules, inline validation badges.
- Build `GraphCompiler` (`src/lib/workflow-studio/graph-compiler.ts`): `canvas_state` → `WorkflowDsl` → `workflowAstValidator` (cycle detection + schema errors); DSL → canvas reverse import; property-based round-trip tests over random DAGs.
- API: `GET/POST /api/workflow-studio/graphs`, `GET/PATCH/DELETE /api/workflow-studio/graphs/[id]`, `POST /api/workflow-studio/graphs/[id]/publish` (compile + create/update `agentic_workflows`, `dsl_hash` versioning, draft→published→archived).
- **Accessibility**: keyboard path to add/move/connect nodes, accessible nodes/edges list fallback, aria-labeled controls (gate #12).

### Wave 4: Gemini Live Multimodal Session Adapter (Commit 4, flag `live_streaming`)
- Define `LiveSessionProvider` interface (`src/lib/live/provider.ts`) with:
  - `GeminiLiveProvider`: real Live API WS session (model IDs configurable in provider config; defaults documented in code), **PCM16 @16 kHz mono base64 chunks (100 ms)**, server-VAD/activity-management config, exponential-backoff reconnect, tool-call passthrough into `PluginSandbox`.
  - `MockLiveProvider`: offline path mirroring existing `!apiKey` mock convention (used by tests and CI).
- `KeyframePipeline` (`src/lib/live/keyframe-pipeline.ts`): client-side 1 FPS extraction → POST `/api/live/sessions/[id]/events`; **bounded upstream queue with drop-oldest**; frames transient (memory only); hazard output is **model-described structured text** (no CV detector this phase).
- `VadTranscriber` (`src/lib/live/vad-transcriber.ts`): activity gating + streaming STT segment accumulation.
- API: `POST /api/live/sessions` (quota check: max duration, **per-institution daily session-minutes**), `GET /api/live/sessions`, `GET/DELETE /api/live/sessions/[id]`, **`GET /api/live/sessions/[id]/stream` (SSE, `requireAuth`, cookie/header auth — no query-string tokens)**, `POST /api/live/sessions/[id]/events`.
- **Per-institution concurrent-session semaphore**; segments → `agent_live_session_segments` (append-only child rows, single-statement usage counter increments); retention/purge job (90 days).
- Tests: `src/lib/live/__tests__/gemini-live-adapter.test.ts` (mock provider: cadence, segmentation, reconnect, quota expiry, flag-off 403, unauth SSE 401).

### Wave 5: Web Marketplace Cockpit & Studio Pages (Commit 5)
- `/admin/agent-marketplace`: catalog grid (capability tags, star ratings, install status, publish/approve dialogs, review composer) with UI primitives only (`Dialog`, `Badge`, `<Skeleton>`); header cross-link to existing `/admin/marketplace` (Apps) with explanatory separation copy.
- `/operations/workflow-studio`: studio shell + version history + publish flow with inline validation errors (flag-gated; flag-off renders disabled state with explanation).
- `/operations/live-sessions`: session list + viewer (streamed transcript feed via SSE, hazard text, start/stop) with `Badge` status variants.
- Navigation entries in authenticated shell sidebar.

### Wave 6: Mobile Agent Hub Extensions (Flutter, Commit 6)
- **Extend existing `lib/features/agent_hub/`** (do not create a new feature dir):
  - Plugin management sections in `agent_hub_screen.dart`: installed plugins (enable/disable, granted permissions readout), `plugin_detail_screen.dart` (ratings, capabilities, install/uninstall).
  - Run-trigger actions wired to existing workflow run APIs.
  - Live session transcript snippets via existing **`AgentStreamService` (SSE + backoff)** — pull-to-refresh only as offline fallback; offline read-caching for plugin lists.
- New providers added to `agent_hub_providers.dart` (Riverpod conventions), routes already exist under `_authGuard` (`/agent-hub`).
- Tests: `test/features/agent_hub/` (plugin list, trigger, snippet rendering, offline cache).

### Wave 7: E2E Simulation Harness & Release (Commit 7)
- `scripts/marketplace-simulate.ts` — 8 stages: seed plugin → submit → approve → install (grant check) → build graph → publish DSL → execute run with sandboxed tool (**allow + denial paths, both audited**) → start/stop live session → **verify synchronous Merkle lifecycle chain**.
- Wire `pnpm marketplace:simulate` in `package.json`.
- `CHANGELOG.md` release notes; merge to `master` `--no-ff`; tag **`v3.39.0`**.

---

## 3. Quality Gates Checklist

| # | Quality Gate | Requirement | Verification |
|---|--------------|-------------|--------------|
| 1 | TypeScript | 0 compilation errors | `npx tsc --noEmit` |
| 2 | ESLint | 0 lint errors | `pnpm lint` |
| 3 | Schema Parity | 100% SQLite ↔ PostgreSQL | `packages/db/__tests__/schema-drift.test.ts` |
| 4 | Tenant Isolation | 0 leaks + allowlist entry justified | `pnpm security:tenants` |
| 5 | RequireAuth Guarding | 0 naked route handlers | `pnpm security:requireauth` |
| 6 | RBAC Completeness | 100% of 10 new keys × 15 roles mapped | `pnpm security:rbac` + `marketplace-rbac-matrix.test.ts` (deny cases) |
| 7 | Sandbox & Escalation | allow/deny, timeout kill, budget breach, **escalation ⇒ 403**, **flag-off ⇒ 403** | `src/lib/marketplace/__tests__/plugin-sandbox.test.ts` |
| 8 | Marketplace Lifecycle | semver uniqueness, approval transitions, **global-approval restriction**, manifest-tamper ⇒ re-review, **concurrent rating race** | `src/lib/marketplace/__tests__/plugin-engine.test.ts` |
| 9 | Graph Round-Trip | canvas → DSL → canvas fidelity, cycle rejection, property-based random DAGs | `src/lib/workflow-studio/__tests__/graph-compiler.test.ts` |
| 10 | Live Adapter | 1 FPS cadence, segmentation, reconnect, **quota expiry**, **unauth SSE ⇒ 401**, mock provider path | `src/lib/live/__tests__/gemini-live-adapter.test.ts` |
| 11 | Merkle Durability | **synchronous flush survives simulated crash** | `src/lib/agents/__tests__/merkle-lifecycle-flush.test.ts` |
| 12 | Studio Accessibility | keyboard add/move/connect, list fallback, aria labels | `src/components/workflow-studio/__tests__/studio-a11y.test.tsx` (jest-axe + keyboard walk) |
| 13 | Negative Paths (≥6) | cross-tenant install ⇒ 403/404, missing uninstall ⇒ 404, non-approver global approve ⇒ 403, SSE unauth ⇒ 401, SSRF URL ⇒ failure, denied tool ⇒ audited denial | spread across gates 7/8/10 + integration test |
| 14 | Workflow E2E | published graph executes through existing engine with HITL | `src/lib/agents/__tests__/marketplace-workflow-e2e.test.ts` |
| 15 | Mobile Hub | plugin list, trigger, snippet, offline cache | `thaibahive_mobile_app/test/features/agent_hub/` |
| 16 | Simulation Harness | 8/8 stages pass | `pnpm marketplace:simulate` |

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `@xyflow/react` bundle/SSR issues in Next.js 16 | `"use client"` wrapper + `next/dynamic` `ssr: false` (per `node_modules/next/dist/docs/lazy-loading.md`), explicit-height container |
| Plugin manifest → DSL execution introduces injection | Declarative DSL only (no user code eval); AST validator + policy engine + egress allowlist gate every step |
| Gemini Live WS instability / cost | Backoff reconnect, 1 FPS cap, idle + max-duration timeout, daily institution quotas, `MockLiveProvider` for CI |
| Worker/resource exhaustion under concurrent runs | Global concurrency semaphore + per-institution run budget (quality gate #7), `runtime = "nodejs"` routes |
| Canvas round-trip drift | Property-based tests asserting structural equality `canvas → DSL → canvas` |
| Namespace confusion with App Marketplace | Distinct `/api/agent-plugins/**` + `/admin/agent-marketplace` + cross-link copy; SPEC §0 reconciliation table |
