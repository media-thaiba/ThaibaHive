# Stage 4: App UI/UX, Mobile Polish & Accessibility — Evidence Report

**Release:** ThaibaHive v1.0 Trial  
**Baseline SHA:** `de35bbc5c8651e3c0bd4a592216cb8aa137a5daa`  
**Date:** Mon Oct 26 2026  
**Environment:** Windows, Node v20.19.6, pnpm 12.9.1, Flutter 3.41.9  
**Evidence dir:** `reports/release-1.0/` + `reports/local/`

> **Verification method:** Accessibility gates and Flutter checks were **executed**. Typography/radius and loading-state checks were **code-inspected** (no dev server needed).

---

## Stage 4.1 Web UI/UX & Accessibility

### 4.1.1 Accessibility Test Gates

| # | Check | Command | Outcome | Evidence |
|---|-------|---------|---------|----------|
| 4.1.1.1 | Jest accessibility suite | `pnpm test:a11y` | ✅ PASSED | 3 test suites, 33 tests, exit 0 (19.614s) |
| 4.1.1.2 | axe-core browser audit (WCAG 2.1 AA) | `pnpm a11y:audit` | ❌ FAILED | 11 pages audited: 2 passed, 9 failed; 18 serious violations. Report: `reports/local/accessibility-audit-report.json`. Gate: "serious". |

### 4.1.2 axe-core Audit Details

The audit crawled public (`/auth/login`, `/auth/signup`) and authenticated staff/admin routes with axe-core (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`).

| Page | Role | Result | Violations (impact) |
|------|------|--------|---------------------|
| `/auth/login` | public | ✅ PASS | — |
| `/auth/signup` | public | ✅ PASS | — |
| `/` | staff | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/attendance` | staff | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/tasks` | staff | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/circulars` | staff | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/help-desk` | staff | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/staff` | admin | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/admin/departments` | admin | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/admin/institutions` | admin | ❌ FAIL | `document-title`, `html-has-lang` (serious) |
| `/admin/audit-logs` | admin | ❌ FAIL | `document-title`, `html-has-lang` (serious) |

**Root cause:** The root layout (`src/app/layout.tsx`) correctly exports `metadata.title` and renders `<html lang="en">`. However, all `(shell)`-group authenticated pages fail `document-title` + `html-has-lang`. Public `/auth/*` pages pass. This indicates a metadata/title propagation issue across the `"use client"` shell-layout boundary (`src/app/(shell)/layout.tsx`) — Next.js metadata from the server root layout is not reaching client-rendered shell pages. No `critical` violations; all 18 are `serious`.

### 4.1.3 Typography Compliance (Apple Design Principles §15)

**Rule:** Standalone controls, navigation, badges, shell components ≥ 11px (`text-[11px]`/`text-xs`). Dense data exception (finance ledgers, CCTV HUDs, telemetry overlays) permitted at `text-[10px]`.

| Finding | File | Line | Context | Verdict |
|---------|------|------|---------|---------|
| `text-[10px]` on "Set Availability" dropdown label | `src/components/layout/user-avatar-dropdown.tsx` | 174 | Standalone control (dropdown section label) | ⚠️ VIOLATION (should be ≥11px) |
| `text-[10px]` on "Full View →" dropdown link | `src/components/layout/user-avatar-dropdown.tsx` | 179 | Standalone control (dropdown nav link) | ⚠️ VIOLATION (should be ≥11px) |
| `text-[10px]`/`text-[9px]` | `src/components/accounts/accounts-ledger.tsx` | 45,62,65 | Finance ledger (dense data exception) | ✅ PERMITTED (§15) |
| `text-[10px]` | `src/components/examinations/TabulationRegister.tsx`, `MarkGridTable.tsx`, `HallTicketDialog.tsx` | — | Examinations tables (dense tabular) | ✅ PERMITTED (§15) |
| `text-[10px]`/`text-[9px]` | `src/components/events/event-calendar-view.tsx`, `event-list-view.tsx` | — | Calendar dense views | ✅ PERMITTED (§15) |
| `text-[10px]` | `src/components/diagnostics-button.tsx` | multiple | Diagnostics/telemetry overlay | ✅ PERMITTED (§15) |
| `text-[10px]`/`text-[9px]` | `src/components/neuro/*`, `src/components/swarm/*`, `src/components/eco/*`, `src/components/hardware/*` | — | Telemetry HUDs, CCTV overlays | ✅ PERMITTED (§15) |
| `text-[9px]` | `src/components/operations/visitors/_components/visitor-pass-modal.tsx` | 210 | Visitor pass (dense) | ✅ PERMITTED (§15) |

**Typography verdict:** Most `text-[10px]`/`text-[9px]` usages fall within the dense data exception (§15). Two standalone-control violations found in `user-avatar-dropdown.tsx`. Concentric radius hierarchy (`rounded-2xl` → `rounded-xl` → `rounded-lg` → `rounded-md`) was not verified in detail in this session.

### 4.1.4 Zero Stuck Loading States (spot check)

| File | Pattern | Verdict |
|------|---------|---------|
| `src/contexts/AuthContext.tsx:68-74` | `useEffect` + `fetch("/api/auth/me")` with `.catch(() => setStaff(null))` + `.finally(() => setIsLoading(false))` | ✅ Compliant |
| `src/components/workspaces/workspace-shell.tsx:72-89` | `try/catch` with `finally` setting `setIsLoadingData(false)` | ✅ Compliant |
| `src/app/(shell)/school/timetable/page.tsx:75-76` | `fetch(...).catch(() => ({ classes: [] }))` | ✅ Compliant |

Spot checks confirm `.catch()`/try-catch-finally is used to resolve loading states. No stuck-spinner pattern found in sampled code.

---

## Stage 4.2 Mobile Client Polish (`thaibahive_mobile_app`)

### 4.2.1 Flutter Quality Gate

| # | Check | Command | Outcome | Evidence |
|---|-------|---------|---------|----------|
| 4.2.1.1 | Flutter analyze | `flutter analyze --no-fatal-infos --no-fatal-warnings` | ✅ PASSED | "No issues found!" (ran in 41.0s), exit 0 |
| 4.2.1.2 | Flutter test | `flutter test` | ✅ PASSED | 297 tests, all passed, exit 0 |

### 4.2.2 Mobile Release Version Alignment

Per `docs/RELEASE_METADATA_WORKFLOW.md`, version coherence must hold across `pubspec.yaml`, `src/config/release-metadata.json`, and `/api/system/update`.

| Source | Version | Status |
|--------|---------|--------|
| `thaibahive_mobile_app/pubspec.yaml:3` | `3.42.8+23` | Current app version |
| `thaibahive_mobile_app/src/config/release-metadata.json` | **DOES NOT EXIST** | ❌ MISSING |
| `src/app/api/system/update/route.ts:44` | `3.20.0+15` (hardcoded default) | ❌ STALE |
| `src/app/api/system/update/route.ts:28` | reads `src/config/release-metadata.json` | File absent → fallback used |

**Finding S4-4:** `pubspec.yaml` declares `3.42.8+23` but `/api/system/update` serves `3.20.0+15` because `release-metadata.json` is absent and the API falls back to hardcoded defaults. The update endpoint will tell mobile clients they're on a version 1.22 releases behind, triggering incorrect update prompts. `release-metadata.json` must be created and kept in sync with `pubspec.yaml`.

### 4.2.3 Mobile Auth & Handoff (code inspection)
- `flutter_riverpod` + `go_router` for state/routing (pubspec.yaml)
- `flutter_secure_storage` for JWT token storage (`AppConstants.storageTokenKey`)
- `cached_network_image` for optimized network images
- `pull_to_refresh` for pull-to-refresh on dashboards/lists
- WebView nonce handoff via `/auth/mobile-handoff/nonce` (per mobile conventions)

These are implemented per convention; no code defects found in static inspection.

---

## Stage 4 Consolidated Findings

| # | Severity | Finding | Gate | Action |
|---|----------|---------|------|--------|
| S4-1 | High | axe audit: all 9 authenticated pages fail `document-title` + `html-has-lang` (serious WCAG) | 4.1.1.2 | Fix metadata/title propagation across `(shell)` client-layout boundary |
| S4-2 | Medium | `user-avatar-dropdown.tsx:174,179` uses `text-[10px]` on standalone controls (≥11px required) | 4.1.3 | Change to `text-[11px]`/`text-xs` |
| S4-4 | High | Mobile version misalignment: pubspec `3.42.8+23` vs API default `3.20.0+15`; `release-metadata.json` missing | 4.2.2 | Create `src/config/release-metadata.json` synced to `3.42.8+23` |

### Artifacts Produced
- `reports/local/accessibility-audit-report.json` (axe-core audit)
- This report: `reports/release-1.0/stage-4-ui-mobile.md`

---

## Readiness for Stage 5

Stage 4 executed with captured evidence. **3 findings require triage** (S4-1 a11y title propagation, S4-2 typography, S4-4 mobile version alignment) before the v1.0.0-trial tag. Flutter analyze (exit 0) and test (297 passed) both green. Jest a11y suite (33/33) green. Proceed to **Stage 5: Quality Gate Battery** when ready.
