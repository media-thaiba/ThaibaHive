# Phase 10 — Mobile UX & AI Streaming Plan Review (Draft v1 → v2)

**Reviewer**: Mobile UX & AI Streaming reviewer (cross-AI review loop)  
**Verdict on Draft v1**: REVISE → **All findings resolved in Draft v2**

| # | Severity | Finding (Draft v1) | Resolution (Draft v2) |
|---|---|---|---|
| 1 | HIGH | Duplex WS endpoint has no transport support (no `ws` dep, App Router can't upgrade) | SSE down (`GET .../stream`, requireAuth, no query tokens) + POST events up |
| 2 | HIGH | "Gemini Live 3.8" not a coherent adapter target — provider has no session machinery | `LiveSessionProvider` interface; real `GeminiLiveProvider` (configurable model IDs, PCM16 @16 kHz mono base64, server VAD) + `MockLiveProvider` offline path |
| 3 | HIGH | Route/table collision with shipped App Marketplace | SPEC §0 reconciliation; `/api/agent-plugins/**`, `/admin/agent-marketplace` |
| 4 | HIGH | Flutter plan duplicates shipped `features/agent_hub/` | Wave 6 rewritten as extension of existing feature; tests retargeted to `test/features/agent_hub/` |
| 5 | HIGH | RBAC contradicts UX (staff snippets but ❌; no `parent` role) | New `live_stream:snippets:read` for staff/operators; parent snippets explicitly excluded |
| 6 | MED | ReactFlow integration gaps (SSR, container height, a11y) | Client wrapper + `next/dynamic` ssr:false, explicit-height container, accessibility gate #12 |
| 7 | MED | No cost metering/egress controls for live sessions | Usage counters, max duration, daily institution quotas, frames never persisted, transcript retention policy |
| 8 | MED | Hazard bounding-box overlays overspecified (no CV detector exists) | Scoped to model-described structured text; detector integration deferred (exclusion) |
| 9 | MED | Backpressure & mobile live behavior unspecified | Bounded drop-oldest queues, per-institution session semaphore, mobile via existing `AgentStreamService`, offline read-caching |
| 10 | LOW | Workflow Studio is separable scope bloat | Gated behind `workflow_studio` flag so marketplace + live sessions ship independently |
