# Phase 10 — Security & Backend Plan Review (Draft v1 → v2)

**Reviewer**: Security & Backend Architecture reviewer (cross-AI review loop)  
**Verdict on Draft v1**: REVISE → **All findings resolved in Draft v2**

| # | Severity | Finding (Draft v1) | Resolution (Draft v2) |
|---|---|---|---|
| 1 | HIGH | Namespace collision with shipped App Marketplace (`/admin/marketplace`, `/api/marketplace/*`, `marketplace:install/uninstall`) | SPEC §0 reconciliation: new routes `/api/agent-plugins/**`, UI `/admin/agent-marketplace`, install keys **reused** |
| 2 | HIGH | Duplex WS endpoint infeasible on Next.js App Router | Transport redefined: SSE down + POST up (vision/stream pattern); custom WS server explicitly excluded |
| 3 | HIGH | Grant escalation via `granted_tool_permissions` | `granted ⊆ manifest ∩ installer ACL`; privileged namespaces require approver re-grant; escalation ⇒ 403 test |
| 4 | HIGH | Sandbox overstated as security boundary; SSRF unaddressed | Reworded as resource containment; egress allowlist (HTTPS + DNS IP range rejection); `runtime = "nodejs"` mandated; semaphore promoted to gate #7 |
| 5 | HIGH | RBAC matrix incomplete vs 15 roles; global approval mis-tiered | Full 15-role × 10-key matrix; global (NULL-institution) approval restricted to `super_admin`/`system` |
| 6 | MED | PLAN Wave 1 wrong unique index `(institution_id, status)` | Fixed: non-unique; added unique `(institution_id, graph_name, graph_version)` |
| 7 | MED | Merkle lifecycle events don't fit buffered tool-invocation API | Event-typed entries + **synchronous `flushPendingInvocations()`**; crash-loss test (gate #11) |
| 8 | MED | Feature-flag gating missing | Added `workflow_studio` + `live_streaming` flags; flag-off ⇒ 403 tests (gates #7, #10) |
| 9 | MED | Unbounded JSON transcript columns (write amplification, PII) | Child table `agent_live_session_segments` + retention/purge (90d) + quota columns |
| 10 | MED | Denormalized counter races (ratings, installs) | Single-statement SQL aggregates in transactions; concurrent-review test (gate #8) |
| 11 | MED | Tenant visibility rules unspecified; cross-tenant review bombing; nullable institution trips Rule D | `scope` column + explicit visibility rules; review unique key includes `institution_id`; allowlist entry with justification |
| 12 | MED | Convention/test gaps (install body-flag uninstall, few deny paths) | Real `DELETE .../install` (404-on-missing); negative-path checklist ≥6 cases (gate #13) |
