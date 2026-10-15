# NFC Presence Verification — Server-First Enforcement Core (v3.42.0)

## Objective

Replace trust in client-reported presence (`isWithinGeofence`, `isMockLocation`)
with deterministic, fail-closed server-side enforcement of
`presenceVerificationSettings`, add NFC anti-replay, a staleness sweep cron,
and wire the Flutter mobile `performCheck` pipeline. Feature-gated behind
`presence_tracking` (default OFF).

**Branch**: `feat/presence-enforcement-core` · **Release**: v3.42.0 (2026-10-15)

## Refinements (agreed before execution)

1. **Backfill disambiguation**: location match → single membership → NULL
   (no `is_primary` column on `staff_institutions` exists to guess from).
2. **NFC nonce tiers**: live taps use a 5-minute single-use nonce; offline
   outbox entries use a content-hash key + shift-window bound (no nonce to
   burn offline).
3. **Cron auth**: `/api/cron` prefix in `CRON_SECRET_ROUTES` with the
   isolated `role: "system"` machine identity (has `system:cron`).
4. **Bulk presence-log ingestion**: single POST may carry `{ logs: [...] }`.
5. **Cron checkout capping**: `checkOut` = `min(now, shiftEnd, session-date
   23:59:59)` so late sweeps never write a next-day timestamp.

## Waves

| Wave | Commit | Deliverable |
|------|--------|-------------|
| 1 | `14dbba19` | `institution_id` + `source` on `attendance_logs`/`presence_logs`, tenant indexes, `presence_tracking` flag, deterministic backfill script (applied, report committed) |
| 2 | `179e9d15` | `presence-enforcement-engine.ts`: mock heuristics, client-claim discard, `enforceable = flag && isEnabled && !shadowMode`, `enforcePresence` never throws; settings resolution institution → global → defaults (24 tests) |
| 3 | `dcd474b5` | presence-log route rewrite (Zod, tenant scoping, `enforcePresence` when flag ON), check-out optional presence payload, schemas |
| 4 | `34dcb5c1` | `GET/POST /api/cron/presence-sweep`: staleness sweep with auto-checkout, shadow gating, shift-capped timestamps (8 tests) |
| 5 | `92069323` | NFC anti-replay: two-tier nonces (live 5-min single-use jti `nfc:{staff}:{nonce}`; offline content-hash `nfc-offline:{sha256(...)}` 48h), `NfcValidationOptions`, precheck-then-consume ordering (failed validation never burns nonce), `requireAntiReplay = isPresenceTrackingEnabled()`; Jest TZ pinned UTC in `jest.global-setup.ts` (20 tests) |
| 6 | `7eb8e25c` | Mobile wiring: main-isolate `performCheck` listener + reentrancy guard, settings fetch (5-min cache) honoring `isEnabled`, offline-buffer flush, `staffId` persistence; GET `/api/attendance/settings` relaxed to `attendance:read` for tenant members (writes unchanged); double `/api` prefix fix; camelCase presence-model contract |
| 7 | (this) | `GET /api/attendance/violations` (`attendance:manage`, tenant-scoped violation read model), plan record, v3.42.0 changelog |

## Key decisions

- **Fail-closed**: engine evaluation errors mark presence `unverified` and
  increment violations; enforcement never throws into request handlers.
- **Client claims are advisory only**: distance/mock/geofence are recomputed
  server-side; stored `isWithinGeofence` is overwritten when the flag is ON.
- **Shadow mode default ON** for new installs (`PRESENCE_DEFAULT_SETTINGS`),
  so violations are observable before actions trigger.
- **Jest TZ**: runtime `TZ` switches do not propagate through the Jest
  sandbox — `process.env.TZ = "UTC"` is pinned first in
  `jest.global-setup.ts` (real process, propagates to workers).
- **Settings read model**: GET uses `attendance:read` + membership-verified
  `resolveRequestInstitution` (clients need grace/interval/radius for UX);
  global scope stays admin-only; PUT/POST keep `attendance:manage`.

## Verification (final)

- Full Jest suite: 849 suites / 5466+ tests green (TZ=UTC).
- `tsc --noEmit`: 0 errors · ESLint: 0 errors on changed files.
- `pnpm security:rbac` — 100% route permission mapping.
- `pnpm security:requireauth` — 0 naked handlers.
- `pnpm security:tenants` — 0 tenant leaks.
- `flutter analyze` — 0 issues (mobile app).
