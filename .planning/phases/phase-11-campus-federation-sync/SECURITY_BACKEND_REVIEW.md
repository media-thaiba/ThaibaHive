# Phase 11 — Security & Backend Cross-AI Plan Review

**Rule source:** AGENTS.md "Plan Review Rule" — Qwen, OpenCode (local ollama), and Claude Code
must each review every plan before execution. **Status: CONVERGED — APPROVED (Round 2).**

## Round 2 (convergence) — all legs APPROVE

| Leg | Model | Result |
|---|---|---|
| Qwen | `qwen3.6` | **APPROVE** — all six HIGH claims verified genuinely resolved (explicit `institutionId`, PG exclusion constraint, rebinding/pinning, run concurrency, raw-body HMAC, plus token lifecycle / masking / retention / nonce TTL / expiry / namespace gate); 0 required changes |
| OpenCode | `qwen3.5` | **APPROVE** — all ten round-1 conventions verified binding in the revised text; 0 required changes |
| Claude Code | `claude -p --bare` (local endpoint) | **APPROVE** — 12 items confirmed (namespace rule + gate 16, exclusion constraint, Merkle trails, HMAC, identity map, dual-dialect concurrency, PII hashing, flag gating, expiry); 0 required changes |

No open HIGH findings. SPEC/PLAN Draft v2 is **cleared for execution at Wave 1.**

## Round 1 — dispositions

| Leg | Vehicle | Model | Findings | Verdict |
|---|---|---|---|---|
| Qwen | ollama `/api/chat` | `qwen3.6` | 12 | REVISE |
| OpenCode (local routing) | ollama `/api/chat` | `qwen3.5` | 10 | REVISE |
| Claude Code | `claude -p --bare` (local Anthropic-compatible endpoint) | `qwen2.5-coder` | 1 (repeated) | REVISE |

Raw outputs: `qwen-review-v1.txt`, `opencode-review-v1.txt`, `claude-review-v1.txt` in
`%TEMP%\opencode\`.

> **Honest note on the Claude Code leg:** this workstation's `claude` CLI is configured against
> the local Ollama endpoint (`ANTHROPIC_BASE_URL=localhost:11434`), so that leg is a weaker
> reviewer. It degenerated into a repeated row asserting the "federation" namespace/overlap risk —
> which is already SPEC §0 and Risk #1. Recorded below as validated-concern, no new actionable
> items. Qwen (qwen3.6) carried the substantive review.

## Disposition Legend
**ACCEPT** — folded into SPEC/PLAN Draft v2 · **ACCEPT (modified)** — adopted with a stated
change · **REJECT** — rejected with rationale (recorded so the rejection is deliberate, not missed).

---

## A. Qwen (qwen3.6) — 12 findings

| # | Sev | Finding | Disposition |
|---|---|---|---|
| Q1 | HIGH | `sis_sync_runs` declares index `(institution_id, started_at)` but the column list never declares `institutionId`. Same implicit gap on `sis_sync_records` / `sis_mapping_queue` / `sis_sync_audit` — the tenant-scan Rules A–D and `security:tenants` gate depend on an explicit column. | **ACCEPT** — every `sis_*` table now declares `institutionId` (non-null, FK cascade) explicitly in the schema table. |
| Q2 | HIGH | A unique index cannot express "no overlapping intervals" on PostgreSQL. `[10:00,12:00)` and `[11:00,13:00)` are distinct rows, so a unique `(pool_id, starts_at)` passes. | **ACCEPT (modified)** — PostgreSQL gets `EXCLUDE USING gist (pool_id WITH =, tsrange(starts_at, ends_at) WITH &&) WHERE status IN ('approved','confirmed')` via a hand-written migration (Drizzle cannot express it); SQLite keeps a partial unique index **plus** a transactional predicate check in the same style as the existing `bookings` engine. Gate 10 runs on both dialects (SQLite jest + `postgres-ci` job). |
| Q3 | HIGH | Post-DNS IP validation is bypassable by DNS rebinding and by redirect hops that resolve differently. | **ACCEPT** — §Security 2 strengthened: block metadata hostnames before DNS (`metadata.google.internal`, `metadata.goog`, `169.254.169.254`), re-validate every redirect hop, and pin the validated IP to the connection via a custom `lookup` so the second resolution cannot differ. |
| Q4 | HIGH | Two triggers (webhook + cron) can run the same connector concurrently → checkpoint corruption and Merkle chain breaks. | **ACCEPT** — partial unique index `(connector_id) WHERE status = 'running'` (portable across both dialects) + `pg_advisory_xact_lock` on PostgreSQL; second concurrent start returns 409 with `Retry-After`. New gate. |
| Q5 | HIGH | "Drop Drizzle for `cross_campus_bookings`" — Drizzle cannot model range types/exclusion constraints. | **ACCEPT (modified)** — rejected in part. The table stays in Drizzle with plain `timestamp` columns; only the exclusion constraint + gist index are raw migration SQL, and `tsrange()` is used as an expression (no `pg-range` types in the ORM layer). Rejected: dropping Drizzle for the table. |
| Q6 | MED | Ed-Fi/OneRoster adapters have no OAuth2 token lifecycle (refresh-before-expiry, version negotiation). | **ACCEPT** — Wave 3 adds `src/lib/sis/token-lifecycle.ts`: TTL-aware refresh, per-connector in-process cache, Ed-Fi `api/v5.x/data/v1` version path, OneRoster 1.2; test asserts refresh before expiry. |
| Q7 | MED | `credentialRef` would be returned in API DTOs, bypassing vault rotation/audit. | **ACCEPT (modified)** — DTOs never return `credentialRef`; responses carry `hasCredential: boolean` + masked `***-ref`. Resolution happens only inside the run engine under the `system` path, and vault reads are Merkle-logged. KMS-at-rest rejected: the column holds a key *name*, not a secret (documented). |
| Q8 | MED | Merkle audit tables will bloat with no retention policy. | **ACCEPT (modified)** — partitioning rejected as over-engineering for phase scale; `retentionDays` column + scheduled purge job + documented Merkle verification window adopted. |
| Q9 | MED | Webhook nonce replay cache has no TTL/eviction → unbounded growth. | **ACCEPT** — nonce store TTL 600s (2x the ±300s window), bounded per-connector entries with LRU eviction, periodic cleanup, test for expiry + bound. |
| Q10 | LOW | No PostgreSQL Row-Level Security; tenancy is application-layer only. | **REJECT (phase gate)** — RLS policies cannot exist on SQLite, so a mandatory RLS gate would break the repo-wide dual-dialect parity convention this platform enforces; the enforced control is app-layer scoping + `pnpm security:tenants` (currently 0 leaks). Recorded as a platform-wide follow-up spike, not a Phase 11 gate. |
| Q11 | LOW | `requested` cross-campus bookings can stall forever. | **ACCEPT** — `expiresAt` on `cross_campus_bookings`, cron transitions expired `requested` → `declined` with an audit entry; new test. |
| Q12 | LOW | "Verified free" namespace claim has no empirical gate. | **ACCEPT** — route-namespace assertion test added (fails if any Phase 11 route appears under `/api/operations/federated`, `/api/federation`, `/api/admin/federation`, `/admin/federated`, or if any new table uses `federated*` naming) + explicit grep in Wave 1. New gate. |

---

## B. OpenCode / local-routing (qwen3.5) — 10 findings

| # | Sev | Finding | Disposition |
|---|---|---|---|
| O1 | HIGH | All new routes must import `requireAuth` from the central utility, no inline auth. | **ACCEPT** — restated as an explicit Wave 2–4 requirement; enforced by existing `pnpm security:requireauth` (gate 5). |
| O2 | HIGH | All new Zod schemas must live in `src/lib/validation/schemas.ts`, not colocated. | **ACCEPT** — added to Wave 1/2 as a binding convention. |
| O3 | HIGH | Every schema change must ship a generated migration, applied idempotently from scratch. | **ACCEPT** — already in Wave 1 (`pnpm db:generate` + `db:generate:pg`); strengthened: gate 14 also runs `db:migrate` on an empty database, not only incrementally. |
| O4 | MED | Adapter tests must mock HTTP; no real network in jest. | **ACCEPT** — `fetch` mocked in all adapter/webhook suites; no live egress in tests. |
| O5 | HIGH | Permission keys must be added to the single canonical permission list/type in `roles.ts`. | **ACCEPT** — Wave 1 states keys are added once to the canonical list (type + role maps) and gate 6 (`security:rbac`) proves 0 unmapped. |
| O6 | MED | Egress guard must not carry DNS state across requests. | **ACCEPT** — guard is stateless per invocation; test asserts two consecutive calls with different resolutions do not leak into each other. |
| O7 | HIGH | Feature flag must be a plain boolean following `src/lib/features.ts` exactly. | **ACCEPT** — `sis_sync: boolean`, no new shape. |
| O8 | LOW | Admin nav links must be permission-filtered before render. | **ACCEPT** — Wave 5 states both entries use the existing `adminItems` permission filtering so `staff`/`hod` never see them. |
| O9 | MED | RBAC matrix test must not mutate shared role fixtures. | **ACCEPT** — Wave 1 extends `rbac-5tier-matrix.test.ts` with fresh expectations; no mutation of existing fixtures. |
| O10 | HIGH | Webhook HMAC must be verified on the **raw body before parsing**, with connector secret fetched first. | **ACCEPT** — §Security 3 rewritten: read bounded raw body → constant-time HMAC over `timestamp.body` → only then Zod-parse; connector secret resolved before any payload handling; ownership check unchanged. |

---

## C. Claude Code leg (qwen2.5-coder) — 1 finding (repeated 19x)

| # | Sev | Finding | Disposition |
|---|---|---|---|
| C1 | HIGH | "federation" ambiguity / regional-analytics overlap — reuse `regionalGroups`/`institutionClusters` and reserve `/api/operations/federated/**`, `src/lib/federation/**`, `/admin/federated/**`. | **Already resolved** — exactly SPEC §0 + PLAN Risk #1. The repetition is model degeneration, not 19 separate issues. Concern validated; no new action. |

---

## D. Consolidated verdict

- **HIGH findings raised:** 6 (Q1–Q5, plus O1/O2/O5/O7/O10 as convention HIGHs) — **all resolved
  in SPEC/PLAN Draft v2** (no HIGH left open).
- **REJECTED with rationale:** RLS as a Phase 11 gate (Q10), dropping Drizzle for one table (Q5),
  audit-table partitioning (Q8), KMS-at-rest for a key *name* (Q7).
- **New gates added:** 16 route-namespace assertion, 17 sync-run concurrency (409), 18
  webhook raw-body HMAC ordering + nonce TTL, 19 request-expiry cron.
- **Round 2 result:** all three legs APPROVE with zero required changes — review loop closed,
  execution authorized at Wave 1.
