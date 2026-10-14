# Phase 11 SPEC: Multi-Campus Federation & SIS/LMS Standards Sync (Track A) — Draft v2

## Ambiguity Score: 2/10 (Draft v2 — **Round-2 cross-AI review converged: APPROVE from Qwen, OpenCode, and Claude Code; no open HIGH. Cleared for execution.**)

---

## 0. Relationship to Existing Assets (Namespace Reconciliation)

This phase uses the word **"federation"** in a way that collides with **three already-shipped,
unrelated** meanings of the same word, plus a regional-analytics layer that already implements
part of Track A. Getting this wrong is the single largest risk in the phase.

| Shipped Asset | Location | What it actually means | Phase 11 Rule |
|---|---|---|---|
| **Multi-Campus Regional Analytics (Sprint-009)** | `regionalGroups`, `institutionClusters`, `regionalAccessGrants`, `regionalBenchmarks`, `regionalHodRankings`, `regionalAccessLogs`, `dwAggregatedAnalytics`, `dwMaterializedSnapshots`; UI `/admin/regional-analytics` (5 components); API `/api/admin/regional`, `/api/export/regional` | **Multi-campus grouping + cross-institution reporting.** This already *is* the regional federation data model. | **Reuse, never rebuild.** Cross-campus scheduling hangs off `institutionClusters`/`regionalGroups`. New code adds tables beside these, not over them. |
| **Federated Learning (FL)** | `src/lib/operations/federated/` (`fed-algorithms`, `byzantine-defense`, `poisoning-detector`, `fed-aggregation-server`); UI `/admin/operations/federated-learning`; API `/api/operations/federated/**` (15 routes) | Distributed ML training across nodes | **No overlap.** API namespace `/api/operations/federated/**` is **reserved for FL** — Phase 11 must not add a single route there. |
| **GraphQL API Federation** | `src/lib/federation/` (`gateway`, `query-planner`, `schema-manager`); API `/api/graphql/federated`, `/api/admin/federation/**` | Graph schema stitching / BFF gateway | **No overlap.** `src/lib/federation/**` is **reserved**. |
| **Cross-Tenant Policy Sync** | `src/lib/federated/` (`policy-sync-engine`, `cross-tenant-role-mapper`, `federated-audit-aggregator`); `/admin/federated/governance` | Replicating policy/role config between tenants | **No overlap**, but this is the closest *pattern* to reuse for outbound sync scheduling and versioning. |
| **Mobile / Background Sync** | `backgroundSyncLogs`, `src/lib/mobile/sync-{queue,appliers,records}`, `src/lib/offline/sync-conflict-resolver.ts`, `src/lib/mesh/{sync-queue,crdt-resolver,vector-clock}`, permission `sync:manage` | Offline-first client replication | **Reuse the conflict resolver and vector-clock patterns** for sync-run reconciliation; do **not** reuse the `sync:` permission prefix (device-scoped). |

**Naming decision (binding):** Phase 11 never uses the bare word `federation`/`federated` in a
route, table, or permission. Instead:

| Concern | New namespace | Rationale |
|---|---|---|
| SIS/LMS standards sync | `/api/sis/**`, tables `sis_*`, prefix `sis:` | Unambiguous, matches Ed-Fi/OneRoster domain language. Verified free, and **locked by gate 16** (route-namespace assertion test). |
| Cross-campus resource scheduling | `/api/cross-campus/**`, tables `cross_campus_*`, prefix `crosscampus:` | Verified free, locked by gate 16. |
| Cockpit pages | `/admin/sis`, `/admin/cross-campus` | Verified free, locked by gate 16. |

**Tenant-boundary reality check:** `institutions` currently has **no parent/hierarchy column**
(`type` defaults to `"campus"`). Hierarchy is expressed *only* through `institutionClusters`
→ `regionalGroups`. Phase 11 must not invent a second hierarchy.

---

## What This Phase Delivers (User-Visible)

### Regional Administrator Experience
- **Regional Federation Cockpit**: a `/admin/cross-campus` workspace that renders the existing
  `regionalGroups` → `institutionClusters` tree as an operable map — which campuses are linked,
  which SIS connectors are healthy, sync freshness per campus, and open cross-campus requests.
- **Cross-Campus Resource Scheduling**: shared resource pools (labs, halls, buses, exam venues)
  spanning every campus in a `regionalGroup`, with double-booking detection **across** institution
  boundaries, a request → approve → confirm flow, and an auditable allocation ledger.

### System Administrator Experience
- **SIS/LMS Connector Registry**: per-institution connectors for **Ed-Fi** (REST + OAuth2 client
  credentials) and **OneRoster 1.1 / 1.2 CSV+REST**, storing a *reference* to credentials (never
  plaintext), with a connectivity test, field-mapping configuration, and per-entity enable toggles.
- **Sync Run Console**: resumable, idempotent sync runs (`full` | `delta`) showing per-entity
  counts (`read / created / updated / skipped / failed`), a diff preview before commit, dry-run
  mode, and failure detail with retry. Manual trigger plus interval scheduling.
- **Roster Mapping Review**: unmatched external records land in a review queue with an explicit
  "map to existing / create / ignore" decision, so no silent merges across tenants.

### Staff / Integration Experience
- **Webhook & Pull Inbound**: OneRoster delta pulls and Ed-Fi change-data-capture pulls, plus an
  authenticated inbound webhook (`POST /api/sis/webhooks/[connectorId]`) guarded by HMAC signature
  with timestamp tolerance and replay protection.
- **Sync Audit Trail**: every sync mutation writes to the Merkle audit ledger, queryable alongside
  existing audit surfaces, scoped to the institution.

---

## What This Phase Does NOT Deliver (Explicit Exclusions)

| Excluded | Reason |
|---|---|
| A second regional hierarchy / `institutions.parentId` | `regionalGroups` + `institutionClusters` already model this (Sprint-009) |
| GraphQL schema federation, FL route changes, or `src/lib/federated/**` edits | Reserved namespaces (see §0) |
| Writing to *foreign* SIS systems (push-write of grades/attendance upstream) | Phase 11 is read-and-reconcile inbound + local scheduling; bi-directional grade writeback needs a separate FERPA/data-authority review |
| SAML/OIDC cross-campus SSO | Auth handoff is Track 3A scope; `regionalAccessGrants` covers in-app access only |
| Custom EDI/CSV formats beyond Ed-Fi and OneRoster | Two standards, deeply implemented, beat five shallowly |
| Parent/student-facing "switch campus" self-service UI | Requires admissions & enrollment authority workflow; out of scope |
| Real-time streaming roster sync (SSE/WS) | Batch + webhook is the standards-native pattern; avoids reusing the live-stream flag |

---

## Architecture Overview

```
 EXTERNAL SYSTEMS                        INGRESS / EGRESS                  CORE DOMAIN
+---------------------------+   +--------------------------------+   +---------------------------+
| Ed-Fi Data Standard       |-->| OutboundClient                 |   | SisConnectorRegistry      |
|  (REST + OAuth2 token)    |   |  - egress allowlist + DNS check |   |  - per institution        |
+---------------------------+   |  - token cache, retry/backoff   |   |  - standard: edfi/oneroster
                                |  - timeout + response cap       |   +---------------------------+
| OneRoster 1.1/1.2         |-->+--------------------------------+   | SisSyncRunStateMachine    |
|  (REST or CSV ingest)     |   | InboundWebhook                 |   |  - dry_run | full | delta |
+---------------------------+   |  - HMAC + timestamp tolerance   |   |  - idempotent upsert      |
| Campus SIS (manual CSV)   |-->|  - replay window, connector ACL |   |  - resumable checkpoint    |
+---------------------------+   +--------------------------------+   +---------------------------+
                                                                          | RecordMapper
                                +--------------------------------+        |  - external_id <-> local |
                                | Mapping & Conflict Layer       |<-------+        |  - unmatched -> queue  |
                                |  - reuse offline/sync-conflict |        +---------------------------+
                                |    -resolver + mesh/vector-clock|               |
                                +--------------------------------+                v
                                                                                  +---------------------+
 CROSS-CAMPUS SCHEDULING                                                           | Regional Scope      |
+---------------------------+   +--------------------------------+                |  regionalGroups ->   |
| Shared resource pools     |-->| AllocationEngine               |<---------------|  institutionClusters |
|  (lab, hall, bus, venue)  |   |  - cross-institution conflict  |                +---------------------+
+---------------------------+   |  - request/approve/confirm FSM |                        |
                                |  - allocation ledger -> Merkle |                        v
                                +--------------------------------+              /admin/cross-campus
                                                                               /admin/sis
 API SURFACE (all requireAuth + Zod + { error: string } + runtime = "nodejs")
   GET/POST  /api/sis/connectors              GET/POST  /api/cross-campus/pools
   POST      /api/sis/connectors/[id]/test     GET/POST  /api/cross-campus/requests
   POST      /api/sis/connectors/[id]/sync     POST      /api/cross-campus/requests/[id]/{approve,decline}
   GET       /api/sis/runs, /api/sis/runs/[id] GET       /api/cross-campus/availability
   POST      /api/sis/mappings/[id]/resolve    POST      /api/sis/webhooks/[connectorId]  (public + HMAC)
```

---

## Database Schema Model (PostgreSQL & SQLite Parity)

Every table below is added **twice** — `packages/db/schema.ts` **and** `packages/db/schema.pg.ts`
— and is gated by `packages/db/__tests__/schema-drift.test.ts` (100% table/column parity).

| Table | Purpose | Key columns / constraints |
|---|---|---|
| `sis_connectors` | External system definition | `institutionId` (cascade), `standard` (`'edfi'\|'oneroster'\|'csv'`), `name`, `baseUrl`, `credentialRef` (**env/vault key name, never a secret**), `authMode`, `enabled`, `scheduleCron`, `fieldMappingJson`, `lastSyncAt`; unique `(institution_id, name)` |
| `sis_sync_runs` | One execution | `institutionId` (cascade, non-null — **explicit, not derived**), `connectorId` (cascade), `mode` (`'dry_run'\|'full'\|'delta'`), `status` (`'queued'\|'running'\|'completed'\|'failed'\|'cancelled'`), `checkpointJson`, `readCount`/`createdCount`/`updatedCount`/`skippedCount`/`failedCount`, `startedAt`, `finishedAt`, `errorSummary`; index `(institution_id, started_at)`; **partial unique `(connector_id) WHERE status = 'running'`** (one live run per connector) |
| `sis_sync_records` | External↔local identity map | `institutionId` (cascade, non-null), `connectorId`, `entityType`, `externalId`, `localTable`, `localId`, `state` (`'mapped'\|'unmatched'\|'ignored'`), `lastSeenAt`, `payloadHash`; **unique `(connector_id, entity_type, external_id)`** — this is the idempotency key |
| `sis_mapping_queue` | Unmatched records for review | `institutionId` (cascade, non-null), `connectorId`, `entityType`, `externalId`, `proposedPayloadJson`, `status` (`'pending'\|'mapped'\|'created'\|'ignored'`), `resolvedBy`, `resolvedAt` |
| `sis_sync_audit` | Per-mutation Merkle entries | `institutionId` (cascade, non-null), `runId`, `entityType`, `externalId`, `action`, `inputHash`, `prevHash`, `entryHash`, `retentionDays` — sequential chain, mirrors the existing `merkle-ledger` convention |
| `resource_pools` | Cross-campus shared resources | `regionalGroupId` (cascade), `resourceType`, `name`, `capacity`, `homeInstitutionId`; index `(regional_group_id)` |
| `cross_campus_bookings` | Cross-institution allocation | `poolId` (cascade), `requesterInstitutionId`, `hostInstitutionId`, `title`, `startsAt`, `endsAt`, `expiresAt`, `status` (`'requested'\|'approved'\|'declined'\|'confirmed'\|'cancelled'\|'expired'`), `requestedBy`, `decidedBy`, `decidedAt`; **`CHECK (ends_at > starts_at)`** |
| `cross_campus_allocations` | Immutable allocation ledger | `bookingId` (cascade), `sequence`, `action`, `actorId`, `payloadHash`, `prevHash`, `entryHash` — Merkle chained |

Every `sis_*` table carries an **explicit** `institutionId` (non-null, cascade). Nothing is
"inherited" from the connector join — tenant-scan Rules A–D and `pnpm security:tenants` operate
on the column itself.

**Conflict rule (dual-dialect — this is the hard part):**

- **PostgreSQL:** the overlap guarantee comes from an exclusion constraint written as **raw
  migration SQL** (Drizzle cannot express it):  
  `EXCLUDE USING gist (pool_id WITH =, tsrange(starts_at, ends_at) WITH &&) WHERE status IN ('approved','confirmed')`.  
  The table itself stays in Drizzle with plain `timestamp` columns — no `pg-range` types in the
  ORM layer. A racing insert fails at the constraint and is mapped to `409 Conflict`.
- **SQLite:** a partial unique index on `(pool_id, starts_at)` for the common collision **plus**
  the transactional interval-overlap predicate in the same style as the existing `bookings`
  engine — one transaction, insert in the same scope as the check (no check-then-act).
- Both dialect paths are proven: jest runs the SQLite path, and the **`postgres-ci` job runs the
  concurrency test against the real exclusion constraint**. Only the PG leg proves the constraint.

Reads are scoped by `institutionId`/`regionalGroupId`, satisfying tenant-scan Rules A–D
(`pnpm security:tenants` must stay at 0 leaks).

---

## 5-Tier RBAC & Permissions Matrix (7 New Keys x Roles)

New keys: `sis:read`, `sis:manage`, `sis:sync`, `crosscampus:read`, `crosscampus:request`,
`crosscampus:approve`, `sis:webhooks:manage`.

| Permission | super_admin | admin | principal | hod | staff | accounts | purchase | regional_admin | regional_auditor |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `sis:read` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `sis:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `sis:sync` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `sis:webhooks:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `crosscampus:read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `crosscampus:request` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `crosscampus:approve` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

Negative boundaries are enforced by `packages/auth/__tests__/rbac-5tier-matrix.test.ts`; new keys
are added to `packages/auth/roles.ts` **and** must clear `pnpm security:rbac` (0 unmapped keys).
Feature flag **`sis_sync`** gates every new route (off → 403), following the `workflow_studio` /
`live_streaming` pattern in `src/lib/features.ts`.

---

## Security & Sandboxing Requirements

1. **Credentials are references, never values.** `sis_connectors.credentialRef` holds an env/vault
   key name. The resolved secret is read inside the connector process only, never returned by any
   API, never logged, and never written to `sis_sync_runs`. API DTOs never expose the raw column:
   they return `hasCredential: boolean` plus a masked `***-ref`. Vault reads are Merkle-logged.
   (KMS-at-rest deliberately **not** adopted — the column stores a key *name*, not a secret.)
2. **Outbound egress is allowlisted, and stays pinned.** Reuse the SSRF defence already proven in
   `src/lib/marketplace/plugin-sandbox.ts`, hardened for rebind: HTTPS-only; metadata hostnames
   (`metadata.google.internal`, `metadata.goog`, `169.254.169.254`) rejected **before** DNS;
   hostname→IP resolution with private/link-local/metadata rejection **after** DNS; **the
   validated IP is pinned to the connection via a custom `lookup`** so a second resolution cannot
   rebind; **every redirect hop re-validated**; response size cap; hard timeout. The guard holds
   no cross-request mutable state. Blocked attempts are Merkle-logged.
3. **Inbound webhook is authenticated on raw bytes.** Read a **bounded raw body first** →
   HMAC-SHA256 over `timestamp.body` with a constant-time compare → only then Zod-parse. ±300s
   tolerance, nonce replay cache with **TTL 600s** (2x the window), bounded per-connector entries
   with LRU eviction, connector secret resolved **before** any payload handling, and a
   connector-ownership check so one institution cannot post into another's connector (IDOR).
4. **Cross-campus approval is role + tenant checked.** The approver must hold `crosscampus:approve`
   *and* be scoped to the host institution or the owning `regionalGroup` via `regionalAccessGrants`.
5. **Interval conflict is enforced by the database, not by application optimism.** On PostgreSQL
   the guarantee is the `EXCLUDE USING gist` constraint; on SQLite it is a single transaction
   holding the overlap predicate and the insert together. No check-then-act on shared pools; a
   losing racer gets `409`.
6. **PII minimisation + retention.** Synced student records are limited to roster-needed fields;
   payloads are hashed for the audit chain rather than stored raw in logs;
   `sis_mapping_queue.proposedPayloadJson` follows the existing PII purge policy; `sis_sync_audit`
   carries `retentionDays` and a scheduled purge job enforces it (Merkle verification window
   documented — tables are **not** partitioned; that is out of proportion for this phase).
7. **No cross-tenant leak in diffs.** Dry-run previews and run counts are scoped to the caller's
   institution; regional roll-ups require `regional:view`.
8. **Least-privilege runtime.** Sync runs are background jobs under the existing `system` role
   path-scoped secret validation (`CRON_SECRET_ROUTES`), not `super_admin`.
9. **Standards token lifecycle.** `src/lib/sis/token-lifecycle.ts` refreshes OAuth2 tokens before
   expiry (TTL-aware, per-connector cache), targets Ed-Fi `api/v5.x/data/v1` and OneRoster 1.2,
   and fails closed on refresh error — no silent fall-back to an expired token.
10. **One live run per connector.** A partial unique index `(connector_id) WHERE status='running'`
    plus `pg_advisory_xact_lock` on PostgreSQL; a concurrent trigger (cron vs webhook) gets `409`
    + `Retry-After`, never a corrupted checkpoint or a broken Merkle chain.
11. **Requests cannot stall forever.** `cross_campus_bookings.expiresAt`; a cron transitions stale
    `requested` rows to `expired` with an audit entry; re-submission requires
    `crosscampus:request` again.
12. **Tests never touch the network.** Adapter and webhook suites mock `fetch`; the simulator
    runs an in-process local Ed-Fi/OneRoster responder; SSRF tests deliberately target blocked
    addresses only.
13. **Explicit non-goal: PostgreSQL RLS.** Tenancy remains application-layer scoping + the
    `pnpm security:tenants` scanner (0 leaks). RLS policies cannot exist on SQLite and would
    break the dual-dialect parity convention this repo enforces. Logged as a platform-wide
    follow-up spike, not a Phase 11 gate.
14. **Binding conventions for every new route.** `requireAuth` from the central utility (no inline
    auth), Zod schemas declared **in `src/lib/validation/schemas.ts`**, plain boolean feature flag
    `sis_sync`, and permission keys added once to the canonical list in `packages/auth/roles.ts`
    with no mutation of existing role fixtures.

---

## Quality Gates & Verification Checklist

| # | Gate | Pass criteria |
|---|---|---|
| 1 | `npx tsc --noEmit` | 0 errors |
| 2 | `npx eslint .` | 0 errors, 0 warnings (baseline established in Phase 10 cleanup) |
| 3 | Schema parity | `schema-drift.test.ts` 100% table + column parity |
| 4 | `pnpm security:tenants` | 0 critical/high/warning leaks (Rules A–D) |
| 5 | `pnpm security:requireauth` | 0 naked handlers |
| 6 | `pnpm security:rbac` | 7 new keys 100% mapped, 0 unmapped |
| 7 | Flag gating | `sis_sync` off → 403 on every new route |
| 8 | Full Jest suite | all suites green (Phase 10 baseline: 825 suites / 5,228 tests) |
| 9 | Sync idempotency | same external payload applied twice → 0 duplicate local rows |
| 10 | Conflict atomicity | concurrent cross-campus requests on one pool → exactly one wins |
| 11 | SSRF | metadata IP and private ranges blocked post-DNS; allowlisted host passes |
| 12 | Webhook auth | bad signature / stale timestamp / replayed nonce / foreign connector → 401/403 |
| 13 | Escalation | `sis:manage` denied for `staff`/`hod`; `crosscampus:approve` denied for `staff` |
| 14 | Migration | `pnpm db:migrate` from an **empty** database + `pnpm db:verify:columns` clean on SQLite **and** PostgreSQL; exclusion-constraint SQL present in the PG migration journal |
| 15 | E2E harness | `pnpm sis:simulate` — 8 stages green with intact Merkle chain, no live egress (in-process responder) |
| 16 | Namespace assertion | jest test fails if any Phase 11 route registers under `/api/operations/federated`, `/api/federation`, `/api/admin/federation`, `/admin/federated`, or any new table uses `federated*` naming |
| 17 | Sync-run concurrency | two simultaneous triggers on one connector → exactly one `running`, the other `409` + `Retry-After` |
| 18 | Webhook ordering & nonce | signature verified over the raw bounded body **before** any Zod parse; nonce accepted once, rejected after 600s TTL and beyond the per-connector bound |
| 19 | Request expiry | stale `requested` booking → `expired` by cron with audit entry; `sis_sync` default is `false` in `src/lib/features.ts` |
