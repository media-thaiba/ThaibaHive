# Phase 11: Multi-Campus Federation & SIS/LMS Standards Sync (Track A) - Draft v2

## 1. Executive Summary

Phase 11 opens the **standards-integration** surface of the platform: inbound roster/grade
scheduling sync from real external SIS/LMS systems (Ed-Fi, OneRoster), plus cross-campus
resource scheduling across the regional groups the platform already models.

The decisive planning insight from the Draft v1 investigation (validated, and not overturned, by
the Round-1 cross-AI review): **the regional federation
*data model* already exists** (Sprint-009 `regionalGroups` / `institutionClusters` /
`regionalAccessGrants`, UI `/admin/regional-analytics`), and the word "federation" is
already claimed by **three unrelated shipped subsystems** (Federated Learning, GraphQL
federation, cross-tenant policy sync). This phase therefore *completes* an existing story
rather than starting a parallel one, and adopts a collision-free namespace (`sis:`,
`crosscampus:`) as a binding constraint.

### Key Architectural Pillars:
1. **Namespace disambiguation by construction** — no bare `federation`/`federated` in any new
   route, table, or permission key; `/api/operations/federated/**`, `src/lib/federation/**`,
   and `src/lib/federated/**` are read-only for this phase, and a route-namespace assertion
   test (gate 16) makes the claim enforceable rather than aspirational.
2. **Standards-native ingress with a hardened egress** — Ed-Fi/OneRoster pull + webhook, all
   outbound traffic through the proven SSRF allowlist (reused from `plugin-sandbox.ts`) with
   IP pinning and per-hop redirect revalidation.
3. **Idempotency as a schema guarantee** — `sis_sync_records` unique
   `(connector_id, entity_type, external_id)` makes replays a no-op, not an application concern;
   a partial unique index makes "one live run per connector" a schema guarantee too.
4. **Identity-map-first reconciliation** — external↔local mapping is explicit state with a human
   review queue; no fuzzy auto-merge that could cross a tenant boundary.
5. **Database-enforced cross-tenant allocation** — a PostgreSQL `EXCLUDE USING gist` constraint
   (raw migration SQL) plus a single-transaction overlap predicate on SQLite, so shared pools
   cannot be double-booked under concurrency on either dialect.
6. **Merkle-verified mutation trails** — sync mutations and allocation decisions chain into
   `*_audit` tables using the existing sequential SHA-256 convention, with `retentionDays` purge.

### Existing Foundation Reused (Do Not Build)
| Foundation | Reuse for |
|---|---|
| `regionalGroups`, `institutionClusters`, `regionalAccessGrants`, `regionalBenchmarks` | Regional scope, cross-campus ownership, approval authority |
| `/admin/regional-analytics` + `/api/admin/regional` | Navigation and KPI reuse; new cockpit links in beside it |
| `src/lib/marketplace/plugin-sandbox.ts` egress allowlist | Outbound SSRF/DNS defence for the sync client |
| `src/lib/offline/sync-conflict-resolver.ts`, `src/lib/mesh/{vector-clock,crdt-resolver,sync-queue}` | Delta reconciliation + conflict precedence |
| `src/lib/federated/policy-sync-engine.ts`, `policy-version-manager.ts` | Scheduling/versioning shape for connector config changes |
| `src/lib/agents/guardrails/merkle-ledger.ts` | `sis_sync_audit` / `cross_campus_allocations` chains |
| `bookings` interval-overlap semantics | Cross-campus conflict predicate |
| `requireAuth` + Zod (`src/lib/validation/schemas.ts`) + feature-flag pattern | Every new route |
| `packages/auth/roles.ts` 5-tier matrix + `rbac-5tier-matrix.test.ts` | 7 new keys |

---

## 2. Execution Waves & Commits

### Wave 1: Schema, Parity Migrations, RBAC & Flag (Commit 1)
- Add all 8 tables to `packages/db/schema.ts` **and** `packages/db/schema.pg.ts` — every `sis_*`
  table carrying an **explicit non-null `institutionId`**; run `pnpm db:generate` +
  `pnpm db:generate:pg`; confirm `schema-drift.test.ts` 100% parity.
- Hand-author the PostgreSQL exclusion-constraint SQL (`EXCLUDE USING gist … tsrange …`) into
  `drizzle/postgres/` **and** its SQLite counterpart (partial unique index) into `drizzle/`, with
  journal entries in both; gate 14 verifies the constraint text is present.
- Add 7 permission keys once to the canonical list in `packages/auth/roles.ts` across all 5 tiers
  + specialized roles with explicit negative boundaries; extend `rbac-5tier-matrix.test.ts` with
  fresh expectations (never mutate shared role fixtures).
- Add `sis_sync: boolean` (default `false`) to `src/lib/features.ts`; no route is wired yet.
- Add the route-namespace assertion test (gate 16). All new Zod schemas are declared in
  `src/lib/validation/schemas.ts`.
- **Verify:** gates 1–6, 14, 16.

### Wave 2: Connector Registry, Egress Defence & Run Engine (Commit 2)
- `src/lib/sis/connector-registry.ts`, `credential-vault.ts` (ref→secret resolution, **DTO masking
  — `hasCredential` + `***-ref`, never the raw column**), `egress-guard.ts` (plugin-sandbox SSRF
  logic + metadata-hostname pre-DNS block + **pinned IP lookup + per-hop redirect revalidation**,
  stateless per request), `sync-run-engine.ts` (queued → running → completed/failed FSM,
  checkpoint resume, dry-run, counters, **enforces one live run per connector → 409 +
  `Retry-After`**).
- Routes: `GET/POST /api/sis/connectors`, `POST /api/sis/connectors/[id]/test`,
  `POST /api/sis/connectors/[id]/sync`, `GET /api/sis/runs`, `GET /api/sis/runs/[id]`.
  All use `requireAuth` from the central utility; no inline auth.
- **Verify:** gates 1–8, 11 (SSRF), 13 (`sis:manage`/`sis:sync` denials), 17 (run concurrency).

### Wave 3: Ed-Fi & OneRoster Adapters + Mapping Queue (Commit 3)
- `src/lib/sis/adapters/{edfi,onerooster,csv}.ts` — **`token-lifecycle.ts` (TTL-aware OAuth2
  refresh, per-connector cache, Ed-Fi `api/v5.x/data/v1`, OneRoster 1.2, fail closed)**, delta/CDC
  pull, field mapping via `fieldMappingJson`, differential upsert keyed on `sis_sync_records`.
  All HTTP is mocked in tests (no live egress).
- `src/lib/sis/record-mapper.ts` + `GET/POST /api/sis/mappings`, `POST /api/sis/mappings/[id]/resolve`.
- Webhook ingress: `POST /api/sis/webhooks/[connectorId]` — **bounded raw body → constant-time
  HMAC over `timestamp.body` → then Zod parse**; nonce TTL 600s with bounded per-connector store.
- **Verify:** gates 1–8, 9 (idempotent replay), 12 (webhook auth), 18 (ordering + nonce), 13.

### Wave 4: Cross-Campus Scheduling Engine (Commit 4)
- `src/lib/cross-campus/resource-pool.ts`, `allocation-engine.ts` (PG: insert against the
  exclusion constraint → `409` on conflict; SQLite: single-transaction overlap predicate + insert;
  request→approve→decline→confirm FSM), `allocation-ledger.ts` (Merkle chain),
  `expiry-sweeper.ts` (stale `requested` → `expired` + audit).
- Routes: `GET/POST /api/cross-campus/pools`, `GET/POST /api/cross-campus/requests`,
  `POST /api/cross-campus/requests/[id]/{approve,decline}`, `GET /api/cross-campus/availability`.
- **Verify:** gates 1–8, 10 (concurrency: exactly one wins — **run on SQLite and in `postgres-ci`**),
  13 (`crosscampus:*` denials), 19 (expiry).

### Wave 5: Web Cockpit & Navigation (Commit 5)
- `/admin/sis` — connector list, health/freshness per campus, run console with diff preview,
  mapping review queue.
- `/admin/cross-campus` — regional tree map, shared pools, request inbox with approve/decline.
- `src/config/navigation.ts`: entries under `adminItems`, **permission-filtered so `staff`/`hod`
  never see them**; cross-link from `/admin/regional-analytics`.
- **Verify:** gates 1–8; `src/lib/navigation/__tests__/legacy-redirects.test.ts` green.

### Wave 6: E2E Simulation Harness & Release (Commit 6)
- `scripts/sis-simulate.ts` + `pnpm sis:simulate`: seed connectors → dry-run → full sync with
  idempotent replay → webhook replay attack rejected → SSRF blocked → cross-campus double-book
  rejected → approval → Merkle chain verification (8 stages).
- Update `CHANGELOG.md`; branch `feat/phase-11-campus-federation-sync`.
- **Verify:** gate 15, plus gates 1–8 re-run on the final tree.

---

## 3. Quality Gates Checklist

| # | Gate | Command | Wave |
|---|---|---|---|
| 1 | TypeScript | `npx tsc --noEmit` | 1–6 |
| 2 | ESLint baseline | `npx eslint .` (0/0) | 1–6 |
| 3 | Schema parity | `npx jest packages/db/__tests__/schema-drift.test.ts` | 1, 6 |
| 4 | Tenant isolation | `pnpm security:tenants` | 1–6 |
| 5 | Route guards | `pnpm security:requireauth` | 2–5 |
| 6 | RBAC coverage | `pnpm security:rbac` | 1, 6 |
| 7 | Flag gating (off→403) + default `false` | new jest suites in Wave 2–4 | 2–4 |
| 8 | Full test suite | `npx jest` (baseline 825 / 5,228) | 1–6 |
| 9 | Sync idempotency | jest: same payload twice → no duplicates | 3 |
| 10 | Allocation atomicity | jest: concurrent requests → one winner | 4 |
| 11 | SSRF defence | jest: metadata/private IP blocked, allowlisted OK | 2 |
| 12 | Webhook auth | jest: bad sig / stale / replay / foreign → 401–403 | 3 |
| 13 | Permission denials | `rbac-5tier-matrix.test.ts` additions | 2, 4 |
| 14 | Migrations both dialects | `pnpm db:migrate` from empty DB + `pnpm db:verify:columns`; exclusion SQL in PG journal | 1, 6 |
| 15 | E2E harness | `pnpm sis:simulate` 8/8 (in-process responder, no live egress) | 6 |
| 16 | Namespace assertion | jest: no route under the three reserved "federated" trees; no `federated*` tables | 1 |
| 17 | Sync-run concurrency | jest: 2 simultaneous triggers → one `running`, other 409 + `Retry-After` | 2 |
| 18 | Webhook ordering + nonce | jest: HMAC over raw bounded body before parse; nonce TTL 600s + bound | 3 |
| 19 | Expiry + flag default | jest: stale `requested` → `expired` + audit; `sis_sync` defaults `false` | 4, 1 |

---

## 4. Risks & Mitigations

| # | Severity | Risk | Mitigation |
|---|---|---|---|
| 1 | **HIGH** | Namespace collision with the three shipped meanings of "federation" | Binding naming rule in SPEC §0; all new prefixes `sis:`/`crosscampus:`; those three trees are read-only this phase; gated by a route-namespace assertion test |
| 2 | **HIGH** | SSRF / credential exfiltration via a connector `baseUrl`, including DNS rebinding | Egress guard from `plugin-sandbox.ts` + metadata-hostname pre-DNS block, **pinned-IP lookup**, per-hop redirect recheck, size/time caps; secrets held by ref, masked out of every DTO and log |
| 3 | **HIGH** | Cross-tenant roster merge from a bad external ID mapping | Identity map is explicit state; unmatched records go to a human queue; `localId` is always institution-scoped; every `sis_*` table carries an explicit `institutionId`; tenant scanner must stay at 0 leaks |
| 4 | **HIGH** | Double-booking shared pools under concurrent requests | PG `EXCLUDE USING gist` constraint (raw migration) + SQLite single-transaction overlap predicate; losers get 409; gate 10 proven on **both** dialects incl. `postgres-ci` |
| 5 | **MED** | External API drift / partial failures leaving half-applied state | Checkpointed runs + per-record outcomes + `status='failed'` with resume; dry-run preview before commit |
| 6 | **MED** | Webhook replay or cross-connector posting (IDOR) | Bounded raw body → constant-time HMAC → then parse; ±300s window; nonce TTL 600s with bounded store; connector-ownership check (gates 12, 18) |
| 7 | **MED** | Two dialects drifting (a Phase 1-class production incident) | Both schema files edited in the same commit; `schema-drift.test.ts` + `db:verify:columns` in CI; hand-written constraint SQL journaled in both dialect folders |
| 8 | **MED** | PII over-retention in mapping/diff payloads | Hash-first audit entries; payload retention follows existing PII purge policy; `retentionDays` + scheduled purge on audit tables |
| 9 | **LOW** | Ambiguous ownership between `/admin/regional-analytics` and `/admin/cross-campus` | Explicit cross-link banner; regional page stays read-only analytics, cockpit owns operations |
| 10 | **LOW** | Permission sprawl (7 new keys) duplicating existing ones | Keys audit-checked against `roles.ts` to avoid near-duplicates (`sis:` is new, `sync:` deliberately avoided) |
| 11 | **HIGH** | Concurrent sync runs (cron vs webhook) corrupting checkpoints / breaking the Merkle chain | Partial unique index `(connector_id) WHERE status='running'` + `pg_advisory_xact_lock`; loser gets 409 + `Retry-After` (gate 17) |
| 12 | **MED** | OAuth2 token expiry mid-run failing Ed-Fi pulls silently | `token-lifecycle.ts` refreshes before expiry, fails closed on refresh error, pins Ed-Fi/OneRoster API versions |
| 13 | **MED** | A stale `requested` booking blocking a shared pool forever | `expiresAt` + cron → `expired` with audit entry; re-request requires `crosscampus:request` (gate 19) |

---

## 5. Cross-AI Plan Review (Required by AGENTS.md Plan Review Rule)

Full findings and dispositions: `SECURITY_BACKEND_REVIEW.md` (Qwen + OpenCode + Claude Code
legs) and `INTEGRATION_REVIEW.md` (CI/migration/test fit).

| Round | Qwen | OpenCode (local ollama) | Claude Code | Result |
|---|---|---|---|---|
| 1 | `qwen3.6` — 12 findings, REVISE | `qwen3.5` — 10 findings, REVISE | `claude -p` (local endpoint) — 1 finding, REVISE | All HIGHs resolved in Draft v2 |
| 2 | `qwen3.6` — **APPROVE** (all 6 HIGHs verified resolved) | `qwen3.5` — **APPROVE** (all 10 conventions verified binding) | `claude -p --bare` — **APPROVE** (12 items confirmed, 0 changes) | **CONVERGED** |

Round-1 outcome (23 findings): **19 ACCEPT / 4 REJECT-with-rationale** (PostgreSQL RLS as a
Phase 11 gate, dropping Drizzle for one table, audit-table partitioning, KMS-at-rest for a key
*name*). New gates 16–19 added; Risks 11–13 added.

**Status: APPROVED for execution.** Round 2 returned APPROVE from all three legs with zero open
HIGH findings. Begin at Wave 1.
