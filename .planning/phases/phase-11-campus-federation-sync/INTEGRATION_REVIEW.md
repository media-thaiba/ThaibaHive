# Phase 11 — Integration & Delivery Review (Round 1)

**Scope:** CI/CD, migrations, feature flags, navigation, test isolation, and delivery risks —
the "does it fit the existing pipeline" leg of the cross-AI review mandated by AGENTS.md.
**Status: Round 1 findings resolved in Draft v2; Round-2 convergence APPROVED (all three legs).**

## Findings and dispositions

| # | Sev | Finding | Disposition |
|---|---|---|---|
| I1 | HIGH | Exclusion constraint (Q2 in `SECURITY_BACKEND_REVIEW.md`) cannot be produced by `pnpm db:generate` — raw SQL must be hand-authored and journaled, and it must exist in **both** `drizzle/` and `drizzle/postgres/`. | **ACCEPT** — Wave 1 adds an explicit "hand-written migration" step with journal entries in both dialect folders; the drift test still covers table/column parity, and a new assertion checks the exclusion constraint text is present in the PG migration. |
| I2 | HIGH | Gate 10 (allocation atomicity) proved nothing if it only ran against SQLite in-memory, where writes serialize. | **ACCEPT** — gate 10 is duplicated: jest (SQLite, app-logic predicate) **and** `postgres-ci` (concurrent inserts against the real exclusion constraint). Only the PG leg proves the constraint. |
| I3 | MED | `pnpm sis:simulate` would be the first harness that reaches a *remote* system. | **ACCEPT** — the simulator never leaves the machine: it runs against a local mock Ed-Fi/OneRoster responder spun up in-process; egress tests target a `169.254.169.254` / `10.0.0.1` URL precisely because they must be blocked. |
| I4 | MED | Feature-flag parity: gates 7 requires 403 when `sis_sync` is off, but no gate proves the flag defaults to off in production. | **ACCEPT** — gate 7 extended: assert the default export in `src/lib/features.ts` has `sis_sync: false`, plus per-route 403 checks. |
| I5 | MED | Navigation additions can break `legacy-redirects.test.ts` and the nav snapshot conventions. | **ACCEPT** — Wave 5 already lists that test; added `src/config/navigation.ts` entries must declare their permission so filtering is correct (O8). |
| I6 | MED | Two review docs were promised by PLAN §5 but did not exist at Draft v1 time. | **ACCEPT** — both now exist (`SECURITY_BACKEND_REVIEW.md`, this file); PLAN §5 updated with round-1 results. |
| I7 | LOW | No CHANGELOG entry until Wave 6 risks a large unreleased diff. | **ACCEPT (modified)** — CHANGELOG entry stays in Wave 6 (release commit), consistent with Phases 9/10; each wave commit message carries the `phase-11:` prefix. |
| I8 | LOW | Phase directory has no `PLAN.md` size discipline — risks drifting past the ~138-line convention. | **ACCEPT** — v2 stays within ~170 lines; detail lives in the review docs, not the plan. |

## Test-isolation notes (carried from Phase 10 lessons)

- New suites must not mutate `process.env` without `Object.defineProperty(..., { writable: true })`
  (see `security-audits.test.ts` pattern).
- In-memory SQLite isolation: any new store module must follow the `engage-store.ts` in-memory
  pattern so tests do not persist rows across runs.
- Adapter suites mock `globalThis.fetch`; restore it in `afterEach`.

## Mobile impact

**None.** Phase 11 delivers no Flutter surface (no new Riverpod providers, no GoRouter screens,
no handoff changes). Mobile is intentionally out of scope; the mobile app is unaffected and the
`flutter-ci` gate must remain green purely by non-regression.
