# Phase 10 SPEC: AI Agent Marketplace & Live Multimodal Streaming (Track 3B) — Draft v2

## Ambiguity Score: 2/10 (Revised after Security & Backend review + Mobile/AI streaming review; all HIGH findings resolved)

---

## 0. Relationship to Existing Assets (Namespace Reconciliation)

Phase 10 **must not collide** with three shipped features:

| Shipped Asset | Location | Phase 10 Rule |
|---|---|---|
| **App Marketplace** (internal app catalog + access requests) | `/admin/marketplace`, `/api/marketplace/{apps,install,uninstall,access-requests}`, `marketplaceApps`/`userAppAssignments`, `marketplace` feature flag | Untouched. Agent plugin registry gets its **own namespace**: API `/api/agent-plugins/**`, UI `/admin/agent-marketplace` (cross-link from `/admin/marketplace` header). Install/uninstall **reuses existing** `marketplace:install` / `marketplace:uninstall` keys — no near-duplicates. |
| **Mobile Agent Hub** (Flutter) | `lib/features/agent_hub/` (screen, providers, repository, `AgentStreamService`, 3 widgets), route `/agent-hub` | **Extended, not rebuilt.** Wave 6 adds install-status sections, plugin detail, and run-trigger to this feature; tests stay in `test/features/agent_hub/`. |
| **Sprint-100 AIGENT-OS workflow engine** | `agentic_workflows*`, `agent_approval_gates`, DSL parser/validator, execution engine, Merkle ledger | **Reused as-is.** Workflow Studio only produces `canvas_state` → `WorkflowDsl` fed into the existing engine. |

**Streaming transport reality**: Next.js App Router route handlers cannot perform WebSocket upgrades; the repo's live pattern is **SSE down + HTTP POST up** (see `src/app/api/vision/stream/route.ts`, `src/lib/realtime/sse-handler.ts`). All Phase 10 duplex specs below use that pattern.

---

## What This Phase Delivers (User-Visible)

### System Administrator Experience
- **Agent Plugin Marketplace**: Multi-tenant plugin registry with semantic versioning (`major.minor.patch`), verified author badges, capability tags (`finance`, `facilities`, `vision`, `compliance`), community ratings (1–5 stars), and per-tenant install status. Clear visual separation from the existing App Marketplace.
- **Publishing & Approval Pipeline**: Author uploads a Zod-validated manifest (declared tool permissions, resource budget, capability tags) → `pending_review` → admin approval → `approved`; version deprecation; manifest mutation invalidates prior approval (`manifest_hash` recompute).
- **Sandboxed Plugin Execution**: Manifest-driven capability gating (`granted ⊆ manifest ∩ installer's effective permissions`; privileged namespaces require `marketplace:plugins:approve` re-grant) with per-invocation wall-clock/memory budgets, `nodejs` runtime routes, and every allow/deny written synchronously to the Merkle audit ledger.
- **Visual Workflow Studio** (flag `workflow_studio`): Drag-and-drop DAG canvas (`@xyflow/react`, client-only component) compiling to the existing `WorkflowDsl` via `workflowAstValidator`, with live cycle detection, inline node errors, JSON DSL export/import, and versioned draft→publish into `agentic_workflows`.

### Operator / Live Ops Experience
- **Gemini Live Multimodal Sessions**: SSE-down + POST-up duplex sessions for CCTV incident analysis — 1 FPS keyframe extraction, model-described hazard summaries (structured text), Voice Activity Detection (VAD), streaming STT transcript segments, and tool-call passthrough into the plugin sandbox. Sessions bound to a `hardware_zones` camera zone or an operator console, with max-duration, per-institution daily session-minute quotas, and bounded upstream queues (drop-oldest).
- **Live Session Cockpit**: Start/stop controls, streamed transcript feed, session audit trail, escalation into the Vision Shield incident ledger. Frames are transient (never persisted); transcript segments follow Vision Shield privacy retention policy.

### Staff / Security Experience
- **Agent Hub extensions (Flutter)**: Existing `/agent-hub` gains installed-plugin management (enable/disable, granted permissions view), workflow run triggering, and live session transcript snippets behind `live_stream:snippets:read` (streamed via the existing `AgentStreamService` SSE client with backoff; offline read-caching for plugin lists).

---

## What This Phase Does NOT Deliver (Explicit Exclusions)

| Excluded | Reason |
|----------|--------|
| Public third-party developer portal / plugin billing | Internal multi-tenant catalog; author verification is admin-driven |
| Arbitrary native/WASM code uploads | Plugins are declarative manifests + DSL workflows only |
| CV bounding-box hazard detection overlays | Live model returns structured text descriptions; detector integration is a later Vision Shield phase (mock/absent in Phase 10) |
| Parent-facing live transcript snippets | No `parent` role in web RBAC; parents receive resolved-incident push notifications only (existing Vision Shield behavior) |
| Multi-party WebRTC conferencing, E2EE channels | Track 3A scope |
| Custom WebSocket server / WS upgrades | SSE + POST transport mandated by platform constraints |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHORING & CONSUMPTION LAYER                        │
│  /admin/agent-marketplace   (catalog, publish, approve, ratings)            │
│  /operations/workflow-studio (ReactFlow DAG canvas — flag: workflow_studio) │
│  Flutter /agent-hub ext.    (install status, run trigger, live snippets)    │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AGENT PLUGIN & LIVE API LAYER                          │
│  GET/POST   /api/agent-plugins                (catalog + publish)           │
│  POST/DELETE /api/agent-plugins/[id]/install  (install / 404-on-missing)    │
│  POST       /api/agent-plugins/[id]/approve   (super_admin: global only)    │
│  POST       /api/agent-plugins/[id]/reviews                                               │
│  GET/POST   /api/workflow-studio/graphs       (graph CRUD + publish→DSL)    │
│  POST/GET   /api/live/sessions                (start / list)                │
│  GET        /api/live/sessions/[id]/stream    (SSE down — requireAuth)      │
│  POST       /api/live/sessions/[id]/events    (audio/keyframe chunks up)    │
│  All handlers: requireAuth + Zod + { error: string } + runtime = "nodejs"   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
     ┌─────────────────────────┼──────────────────────────┐
     ▼                         ▼                          ▼
┌──────────────────┐  ┌───────────────────┐  ┌───────────────────────────────┐
│ PluginSandbox    │  │ GraphCompiler →   │  │ LiveSessionProvider           │
│ - grant ⊆ manifest│ │ existing DSL +    │  │ - GeminiLiveProvider (WS API) │
│   ∩ installer ACL│  │ execution engine  │  │ - MockLiveProvider (!apiKey)  │
│ - worker budget  │  │ - HITL gates      │  │ - VAD + PCM16 streaming STT   │
│ - sync Merkle log│  │ - cycle validation│  │ - 1 FPS keyframe POST ingest  │
│ - egress allowlist│ │ - feature flag    │  │ - quotas, bounded queues      │
└────────┬─────────┘  └─────────┬─────────┘  └──────────────┬────────────────┘
         │                      │                           │
         └──────────────────────┼───────────────────────────┘
                                ▼
   PostgreSQL/SQLite: agent_plugins, agent_plugin_installations,
   agent_plugin_reviews, agent_workflow_graphs, agent_live_sessions,
   agent_live_session_segments
   + existing agentic_workflows / runs / steps / approval_gates
```

---

## Database Schema Model (PostgreSQL & SQLite Parity)

```sql
-- 1. Agent Plugin Registry (marketplace listings)
CREATE TABLE agent_plugins (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE CASCADE, -- NULL = system/global listing
    scope VARCHAR(32) NOT NULL DEFAULT 'global', -- 'global' | 'institution_private' | 'institution_shared'
    plugin_key VARCHAR(128) NOT NULL,            -- reverse-dns slug
    display_name VARCHAR(128) NOT NULL,
    summary VARCHAR(512) NOT NULL,
    description TEXT,
    version VARCHAR(32) NOT NULL,                -- semver
    author_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    author_verified BOOLEAN NOT NULL DEFAULT FALSE,
    category VARCHAR(32) NOT NULL,               -- 'finance'|'facilities'|'vision'|'compliance'|'academic'|'hr'
    capabilities JSON NOT NULL,
    manifest JSON NOT NULL,                      -- tool permissions, resource budget, entry DSL ref, egress URLs
    manifest_hash VARCHAR(64) NOT NULL,          -- SHA-256 of canonical manifest
    approval_status VARCHAR(32) NOT NULL DEFAULT 'draft', -- 'draft'|'pending_review'|'approved'|'rejected'|'deprecated'
    installed_count INTEGER NOT NULL DEFAULT 0,
    rating_avg REAL NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX agent_plugin_key_ver_idx ON agent_plugins(plugin_key, version);
CREATE INDEX agent_plugin_inst_status_idx ON agent_plugins(institution_id, scope, approval_status);
-- NOTE: nullable institution_id (global listings) pre-registered in
-- scripts/security/tenant-scan-allowlist.json with justification (Rule D).

-- 2. Per-Tenant Installations
CREATE TABLE agent_plugin_installations (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    plugin_id VARCHAR(64) NOT NULL REFERENCES agent_plugins(id) ON DELETE CASCADE,
    installed_version VARCHAR(32) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    granted_tool_permissions JSON NOT NULL, -- subset: manifest ∩ installerEffectivePermissions (+approve for privileged)
    config JSON,
    installed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    last_run_at TEXT,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX agent_inst_tenant_plugin_idx ON agent_plugin_installations(institution_id, plugin_id);

-- 3. Ratings & Review Ledger (tenant-scoped to stop cross-tenant review bombing)
CREATE TABLE agent_plugin_reviews (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    plugin_id VARCHAR(64) NOT NULL REFERENCES agent_plugins(id) ON DELETE CASCADE,
    reviewer_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,                     -- 1..5
    review_text VARCHAR(1024),
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX agent_review_inst_user_plugin_idx ON agent_plugin_reviews(institution_id, plugin_id, reviewer_user_id);

-- 4. Visual Workflow Graphs (studio artifacts)
CREATE TABLE agent_workflow_graphs (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    graph_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    canvas_state JSON NOT NULL,                  -- ReactFlow nodes/edges
    dsl_payload JSON NOT NULL,                   -- compiled WorkflowDsl
    dsl_hash VARCHAR(64) NOT NULL,
    workflow_id VARCHAR(64),                     -- linked agentic_workflows row when published
    graph_version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'draft', -- 'draft'|'published'|'archived'
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX agent_graph_inst_name_ver_idx ON agent_workflow_graphs(institution_id, graph_name, graph_version);
CREATE INDEX agent_graph_inst_status_idx ON agent_workflow_graphs(institution_id, status); -- NON-unique

-- 5. Live Multimodal Sessions (header only — bounded usage counters, no unbounded JSON)
CREATE TABLE agent_live_sessions (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    session_type VARCHAR(32) NOT NULL,           -- 'cctv_analysis' | 'operator_console'
    camera_zone_id VARCHAR(64) REFERENCES hardware_zones(id) ON DELETE SET NULL,
    model_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',-- 'active'|'completed'|'failed'|'terminated'|'expired'
    keyframe_interval_seconds INTEGER NOT NULL DEFAULT 1,
    max_duration_seconds INTEGER NOT NULL DEFAULT 900,
    total_seconds INTEGER NOT NULL DEFAULT 0,    -- usage counters: single-statement increments
    total_frames INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    started_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    ended_at TEXT
);
CREATE INDEX agent_live_inst_status_idx ON agent_live_sessions(institution_id, status, started_at);

-- 6. Live Session Segments (transcript / hazard / tool-call events — append-only child rows)
CREATE TABLE agent_live_session_segments (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    session_id VARCHAR(64) NOT NULL REFERENCES agent_live_sessions(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    segment_type VARCHAR(32) NOT NULL,           -- 'transcript' | 'hazard' | 'tool_call'
    payload JSON NOT NULL,
    created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE UNIQUE INDEX agent_live_seg_seq_idx ON agent_live_session_segments(session_id, sequence);
CREATE INDEX agent_live_seg_inst_time_idx ON agent_live_session_segments(institution_id, created_at);
-- Retention: segments purged per Vision Shield privacy policy (max 90 days, tenant-purge endpoint).
```

---

## 5-Tier RBAC & Permissions Matrix (All 15 Roles × 10 New Keys)

Install/uninstall **reuses existing** `marketplace:install` / `marketplace:uninstall` (already mapped — no change).

| Permission Key | super_admin | admin | principal | hod | staff | accounts | purchase | regional_admin | regional_auditor | teacher | coordinator | institutional_head | exam_coordinator | inspector | system |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `marketplace:plugins:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `marketplace:plugins:publish` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `marketplace:plugins:approve` | ✅ | ✅¹ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅² |
| `marketplace:reviews:write` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `workflow_studio:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `workflow_studio:design` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `workflow_studio:publish` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `live_stream:start` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `live_stream:view` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `live_stream:snippets:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |

¹ `admin` may approve **tenant-scoped** (`institution_id IS NOT NULL`) listings only.  
² `system` (machine role) approves **global** listings on automated pipelines.  
**Global approval rule**: `scope='global'` (nullable `institution_id`) listings may only be approved by `super_admin` or `system` — enforced in `MarketplaceEngine.approve()` and covered by deny tests.

---

## Security & Sandboxing Requirements

1. **Manifest Trust**: SHA-256 `manifest_hash`; any manifest mutation flips `approval_status` back to `pending_review`.
2. **Capability Gating (escalation-proof)**: `granted = manifest.permissions ∩ installerEffectivePermissions`; tool namespaces on the privileged list (`finance:*`, `vision:*`, `hardware:*`, `marketplace:*`, `agents:*`) additionally require `marketplace:plugins:approve` by an actor holding that namespace. Escalation attempt ⇒ 403 + audit entry (unit test).
3. **Resource Containment (explicitly NOT a security boundary)**: `worker_threads` with `resourceLimits` + wall-clock timeout + output cap + concurrency semaphore bound **resource usage only**; all plugin/live routes run `export const runtime = "nodejs"` (never edge/serverless). Process-level isolation (fs/network) is **out of scope** — mitigated by declarative DSL (no user code execution) + policy engine.
4. **Egress / SSRF Policy**: Manifest `config` URLs and camera stream endpoints are fetched only through an allowlist validator (HTTPS-only, DNS-resolved IP check rejecting private/link-local ranges, no redirects to disallowed hosts). Unlisted URL ⇒ step failure.
5. **Audit**: Install/uninstall/approve/reject/publish/session-start/session-end write **event-typed** Merkle entries (`toolName: "marketplace:approve"` etc.) with **synchronous `flushPendingInvocations()`** so lifecycle events are never lost to the 5s buffer; crash-loss covered by test.
6. **Tenant Isolation**: Read visibility = approved **global** listings + caller's own institution; install scoped to caller's institution; review uniqueness `(institution_id, plugin_id, reviewer_user_id)`. Full pass on `pnpm security:tenants` (+ pre-registered allowlist entry for nullable global `agent_plugins.institution_id` with justification).
7. **Live Stream Auth & Transport**: SSE endpoint wrapped in `requireAuth` (cookie/header token — **never tokens in query strings**); POST events endpoint separately guarded with `live_stream:start` + origin allowlist; `workflow_studio`, `live_streaming`, `agentic_workflows`, `marketplace` feature flags gate the corresponding routes (flag-off ⇒ 403 tests).
8. **Data Egress & Retention**: CCTV frames are transient (memory only, never written to disk/DB); transcript/hazard segments in child table with 90-day max retention + tenant purge; session quotas (max duration, daily minutes/institution, bounded upstream queue drop-oldest).

---

## Quality Gates & Verification Checklist

1. **Schema & Dialect Parity**: 100% across `schema.ts` / `schema.pg.ts` (`schema-drift.test.ts`).
2. **RBAC & Route Guarding**: 100% on `security:rbac` (all 15 roles × 10 new keys), `security:requireauth`, `security:tenants` (+ allowlist entry).
3. **TypeScript & Lint**: 0 errors (`npx tsc --noEmit`, `pnpm lint`).
4. **Graph Round-Trip & Cycle Detection**: canvas → DSL → validate → canvas structural fidelity; self/mutual loops rejected.
5. **Sandbox & Escalation**: allow/deny, wall-clock kill, budget breach, **privilege-escalation attempt ⇒ 403**, flag-off ⇒ 403.
6. **Marketplace Lifecycle**: semver uniqueness, approval transitions (incl. global-approval restricted to super_admin/system), manifest-tamper ⇒ re-approval, rating rollup via single-statement SQL (concurrent-review race test).
7. **Live Adapter**: 1 FPS cadence ±10%, transcript segmentation, reconnect/backoff, quota expiry, segment retention/purge.
8. **Negative-Path Coverage (≥6 deny cases)**: cross-tenant install ⇒ 403/404, uninstall missing ⇒ 404, non-approver approving global listing ⇒ 403, SSE without auth ⇒ 401, SSRF'd manifest URL ⇒ step failure, denied tool call ⇒ audited denial.
9. **Merkle Lifecycle Durability**: synchronous flush survives simulated crash between event write and buffer flush.
10. **Simulation Harness**: `pnpm marketplace:simulate` 8/8 stages.
11. **Mobile Agent Hub**: widget tests in `test/features/agent_hub/` (plugin list, trigger, snippet rendering, offline cache).
12. **Studio Accessibility**: keyboard path to add/move/connect nodes, accessible node/edge list fallback, aria labels on controls.
