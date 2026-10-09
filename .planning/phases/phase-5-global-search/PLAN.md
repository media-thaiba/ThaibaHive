# Phase 5: Global Search & Omnibox Command Center — "Cmd+K Everywhere"

**Milestone**: ThaibaHive Two-Tier Platform  
**Phase**: 5 of 5 (post-Freeze roadmap: 1 Capabilities & Nav → 2 Today & Action Center → 3 Media Queue & Offline → 4 Deep Links & Auth Handoff → **5 Global Search**)  
**Status**: Ready for Execution (3/3 Reviews Completed: Security/Backend, Mobile/UX, Web/Frontend)  
**Estimated Duration**: 4-5 days  
**Dependencies**: Phase 1-4 all merged to `master`

---

## 🎯 Executive Summary & Objective

Phase 4 delivered seamless cross-platform navigation. Phase 5 completes the platform with **universal, ultra-low-latency global search** accessible via `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) on **both Web and Mobile**.

**Current State**:
- **Web**: `CommandPalette` exists but only searches *navigation items* (features within current workspace)
- **Mobile**: No command palette / global search exists
- **Backend**: `globalSearch` service exists but covers only 5 entity types (students, staff, tasks, events, announcements) — the schema defines 15+ searchable types

**End State**: Press `Cmd+K` anywhere → instant fuzzy search across **all 15+ entity types** (students, staff, tasks, events, announcements, daily-reports, purchase-requests, help-desk-tickets, recognition, asset-inventory, circulars, bookings, polls, comments, media-assets) with keyboard navigation, rich result cards, and deep-link handoff.

---

## 📐 Architecture & Key Design Decisions

### D1. Search Query Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cmd+K / Ctrl+K                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Web: CommandPalette (Dialog)      Mobile: SearchBottomSheet    │
│  - Debounced query (150ms)         - Debounced query (150ms)    │
│  - Keyboard nav (↑↓, Enter, Esc)   - Touch + HW keyboard nav    │
│  - Sections: Nav + Entities        - Sections: Nav + Entities   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ GET /api/search  │  │ GET /api/search  │
         │ ?q=...&types=... │  │ ?q=...&types=... │
         └────────┬─────────┘  └────────┬─────────┘
                  │                     │
                  └─────────┬───────────┘
                            ▼
                 ┌──────────────────────┐
                 │ globalSearch()       │
                 │ - Parallel DB queries│
                 │ - Per-type ILIKE     │
                 │ - Pagination + Count │
                 │ - Result scoring     │
                 └──────────────────────┘
```

### D2. Entity Coverage (from `globalSearchSchema`)

| Category | Entity Types | Searchable Fields |
|----------|-------------|-------------------|
| **People** | students, staff | name, email, admissionNo/employeeId |
| **Operations** | tasks, events, announcements, circulars, daily-reports | title, description, content, type |
| **Finance** | purchase-requests, expense-claims, fee-receipts | title, description, amount, reference |
| **Support** | help-desk-tickets, bookings, polls | title, description, subject |
| **Social** | recognition, comments | content, title |
| **Assets** | asset-inventory, media-assets | name, type, tags |
| **Navigation** | (existing) workspace items | label, description, href |

### D3. Performance Targets

| Metric | Target |
|--------|--------|
| **Time-to-first-result (p50)** | < 100ms |
| **Time-to-full-results (p95)** | < 300ms |
| **Debounce delay** | 150ms |
| **Max concurrent queries** | 1 (cancel previous) |
| **Result limit per type** | 10 (web), 8 (mobile) |

### D4. Keyboard / Touch UX

| Platform | Open | Navigate | Select | Close |
|----------|------|----------|--------|-------|
| Web | `Cmd/Ctrl+K` | `↑/↓` | `Enter` | `Esc` |
| Mobile | FAB long-press / Header action | Touch / `↑/↓` (HW kb) | Tap / `Enter` | Back gesture / `Esc` |

---

## 📋 Implementation Steps (6 Commits)

### Commit 1: Backend — Security Hardening, Tenant Isolation & Full Entity Coverage (`feat(search)`)

**Files:**
- `src/lib/api/global-search/service.ts` — **CRITICAL FIXES**: Add `resolveScopedInstitutionId` to every query; replace `.select()` with explicit column projections (strip `passwordHash`, `faceEmbedding`, `fingerprintHash`, `aadhaar`, `pan`, `bankAccount`, etc.); remove `skipPagination = true`, enforce hard limit `Math.min(limit, 20)` per type; add query timeout (5s) via `Promise.race`; extend to all 15 entity types with per-type scoring; add `searchSuggestions` endpoint
- `src/app/api/search/route.ts` — Add rate limiting using `checkRateLimit(session.staffId + ':' + ip, "search")` with new `"search"` config (30 req/min); add `GET /api/search/suggestions?q=` endpoint with same security; change permission from `"profile:read"` to `"search:global"`
- `src/lib/validation/schemas.ts` — Strengthen `globalSearchSchema`: `q` with `.max(100).regex(/^[\p{L}\p{N}\s\-@.]+$/u).transform(s => s.replace(/[%_]/g, ""))`
- `packages/auth/roles.ts` — Add `"search:global"` permission mapped to `super_admin`, `admin`, `principal`, `hod` (not `staff`)
- `packages/db/schema.ts` + `schema.pg.ts` — Add indexes: `idx_staff_name(firstName, lastName)`, `idx_students_name(firstName, lastName)`, `idx_students_email(email)`, `idx_tasks_title(title)`, `idx_events_title(title)`, `idx_announcements_title(title)`; PostgreSQL: add `pg_trgm` GIN indexes for ILIKE performance
- `drizzle/00XX_global_search_indexes.sql` + `drizzle/postgres/00XX_global_search_indexes.sql` — Migration files

**Tests:**
- `src/lib/api/global-search/__tests__/service.test.ts` — Unit tests for each entity type, pagination, scoring, **tenant isolation**, **sensitive field exclusion**, **rate limiting**, **query limits**
- `packages/auth/__tests__/rbac-5tier-matrix.test.ts` — Add `search:global` permission test
- `src/app/api/search/__tests__/route.test.ts` — Integration tests for rate limiting, tenant scoping, validation

### Commit 2: Web — CommandPalette Global Search Integration (`feat(web)`)

**Files:**
- `src/components/layout/command-palette.tsx` — Add "Entities" section with rich result cards (avatar/icon, subtitle, entity badge, entity type chip); async fetch with `AbortController` (cancel previous on keystroke); 150ms debounce; loading skeletons (`<Skeleton>`); keyboard navigation across sections (Tab moves between Nav/Entities); result selection → navigate to entity detail; "Open in Mobile" for web-only entities (Phase 4 handoff)
- `src/hooks/use-global-search.ts` — New hook: `useGlobalSearch(query)` returning `{ results, loading, error }` with 150ms debounce, `AbortController` cancellation, in-memory cache (5 min TTL), error state propagation
- `src/lib/api/global-search/types.ts` — Shared TypeScript types for search results (mirror in Dart for parity)

**Tests:**
- `src/components/layout/__tests__/command-palette.test.tsx` — Render with mocked search results, keyboard nav (↑↓/Enter/Esc), selection, debounce, cancellation, entity type coverage parity

### Commit 3: Mobile — Search Bottom Sheet (Core UX + Accessibility + Performance) (`feat(mobile)`)

**Files:**
- `thaibahive_mobile_app/lib/features/search/presentation/search_bottom_sheet.dart` — `SearchBottomSheet` with:
  - `FocusNode` + `RawKeyboardListener` + `FocusScope` focus trap for hardware keyboard (↑/↓/Enter/Esc)
  - 150ms debounce via `Timer` + `CancelToken` lifecycle (cancel previous request per keystroke)
  - `ListView.builder` for virtualized results; `ConstrainedBox(minHeight: 48)` on all tiles
  - `CachedNetworkImage` for avatars with placeholder/error states
  - `Semantics` labels on each result: `"$entityType: $title. $subtitle. Tap to open."`
  - `SemanticsService.announce` for result count changes ("3 results found")
  - Offline detection via `Connectivity().onConnectivityChanged` → cached results + retry banner
  - Empty state: recent searches (from Hive) with "Clear" action
- `thaibahive_mobile_app/lib/features/search/data/search_repository.dart` — Repository with `search(query, cancelToken)` and `suggestions(query)`; accepts `CancelToken` parameter; timeout 5s
- `thaibahive_mobile_app/lib/features/search/presentation/search_provider.dart` — Riverpod `AutoDisposeAsyncNotifier` managing query, results, loading, selected index, cancel token, debounce timer, offline state, connectivity subscription
- `thaibahive_mobile_app/lib/features/search/data/search_models.dart` — `@freezed` `SearchResult` mirroring TypeScript contract (`id`, `entityType`, `title`, `subtitle`, `avatarUrl?`, `initials?`, `nativeRoute`, `webRoute`, `targetPath?`, `isWebOnly`)
- `thaibahive_mobile_app/lib/features/search/data/recent_searches_service.dart` — Hive box `recent_searches` (typeId: 42), max 10 items FIFO, deduplication, clear action
- `thaibahive_mobile_app/lib/app/router.dart` — Add global search trigger (FAB long-press / header trailing action); `Cmd+K` / `Ctrl+K` via `HardwareKeyboard` listener

**Tests:**
- `thaibahive_mobile_app/test/features/search/search_bottom_sheet_test.dart` — Widget test: rendering, 150ms debounce, `CancelToken` cancellation, `ListView.builder` usage, 48dp tile height, `Semantics` labels, focus trap (Tab stays in sheet), result tap navigation
- `thaibahive_mobile_app/test/features/search/search_repository_test.dart` — Unit test with mocked HTTP + `CancelToken`
- `thaibahive_mobile_app/test/features/search/search_provider_test.dart` — Provider test: debounce, cancel token lifecycle, offline state, recent searches persistence
- `thaibahive_mobile_app/test/features/search/recent_searches_service_test.dart` — Hive ops: add/duplicate/max10/clear

### Commit 4: Mobile — Platform Parity, Deep Link Handoff & Polish (`feat(mobile)`)

**Files:**
- `thaibahive_mobile_app/lib/features/search/presentation/search_bottom_sheet.dart` — Entity route strategy mapping:
  ```dart
  const entityRouteStrategy = {
    'students': EntityRouteStrategy.native,
    'staff': EntityRouteStrategy.native,
    'tasks': EntityRouteStrategy.native,
    'events': EntityRouteStrategy.native,
    'announcements': EntityRouteStrategy.native,
    'daily-reports': EntityRouteStrategy.native,
    'circulars': EntityRouteStrategy.native,
    'polls': EntityRouteStrategy.native,
    'purchase-requests': EntityRouteStrategy.handoff,
    'expense-claims': EntityRouteStrategy.handoff,
    'fee-receipts': EntityRouteStrategy.handoff,
    'help-desk-tickets': EntityRouteStrategy.native,
    'bookings': EntityRouteStrategy.native,
    'recognition': EntityRouteStrategy.native,
    'comments': EntityRouteStrategy.native,
    'asset-inventory': EntityRouteStrategy.native,
    'media-assets': EntityRouteStrategy.native,
  };
  ```
  On tap: `strategy == handoff` → `context.push('/handoff?path=...&title=...')` (Phase 4 nonce exchange); else `context.push(nativeRoute)`
- `thaibahive_mobile_app/lib/features/search/presentation/search_bottom_sheet.dart` — Focus restoration on close (return focus to trigger button); `FocusTraversalGroup` for tab order
- `thaibahive_mobile_app/lib/core/services/keyboard_shortcuts.dart` — Register `Ctrl+K` / `Meta+K` via `HardwareKeyboard.instance.addHandler` with priority; open search sheet
- `packages/shared/src/search-types.ts` — **NEW** shared package: TypeScript/Dart identical `SearchResult` + `EntityType` union (15 types)
- `thaibahive_mobile_app/lib/features/search/data/search_models.dart` — Import from shared package (or mirror exactly)

**Tests:**
- `thaibahive_mobile_app/test/features/search/entity_route_strategy_test.dart` — Mapping completeness (all 15 types covered)
- `thaibahive_mobile_app/test/app/global_search_e2e_test.dart` — E2E: open sheet (Ctrl+K), type query, select native entity → GoRouter nav; select web-only entity → `WebViewHandoffScreen` loads
- `packages/shared/__tests__/search-types.test.ts` — Parity: TypeScript entity types == Dart entity types; shortcut strings match

### Commit 5: Web — Accessibility, Empty States & Polish (`feat(web)`)

**Files:**
- `src/components/layout/command-palette.tsx` — Accessibility: `role="dialog"`, `aria-label="Command palette"`, `aria-live="polite"` for result count; focus trap (Tab cycles within); `Cmd+K` opens, `Esc` closes; recent searches in empty state (localStorage, max 10, clear action); loading skeletons for async entity results; error state with retry button
- `src/hooks/use-global-search.ts` — Cache recent searches in localStorage (max 10, dedup); clear action
- `src/components/layout/command-palette.tsx` — Entity result click → navigate; "Open in Mobile" for web-only entities (Phase 4 `/handoff`)

**Tests:**
- `src/components/layout/__tests__/command-palette.test.tsx` — Add: accessibility (axe-core), recent searches persistence, error+retry, entity type parity

### Commit 6: Verification, Documentation & Additional Security Gates (`docs(phase-5)`)

**Files:**
- `.planning/phases/phase-5-global-search/PLAN.md` — Update with verification results
- `src/components/layout/command-palette.tsx` — Add JSDoc for public API
- `thaibahive_mobile_app/lib/features/search/` — Add README.md with usage
- `packages/shared/src/search-types.ts` — Document shared contract

**Verification Gates (All Must Pass):**
1. `pnpm exec tsc --noEmit` → 0 errors
2. `pnpm lint` → 0 errors
3. `pnpm exec jest` → All suites pass (including new search tests)
4. `pnpm security:rbac` + `pnpm security:requireauth` → 100%
5. `pnpm security:tenants` → 100% isolated
6. `pnpm build` → Clean production build
7. `flutter analyze` → 0 errors, 0 warnings
8. `flutter test` → 100% passing
9. **Tenant Isolation Test**: `pnpm security:tenants` → 100% isolated (must pass)
10. **RBAC Test**: `pnpm security:rbac` → `search:global` mapped correctly
11. **Rate Limit Test**: Manual/automated test → 429 after 30 req/min
12. **Data Leakage Test**: Unit test asserting `passwordHash`, `faceEmbedding`, `aadhaar` absent from results
13. **Index Verification**: `EXPLAIN QUERY PLAN` shows index usage for search queries
14. **Load Test**: 100 concurrent searches → p95 < 300ms, no 5xx errors
15. **Accessibility Test**: `pnpm test:a11y` passes; axe-core on CommandPalette; TalkBack/VoiceOver announces result count
16. **Platform Parity Test**: Shared `entityTypes` array identical TS/Dart; shortcuts match (`CmdOrCtrl+K` / `Control+K`)

---

## 🔍 File Changes Summary

| File | Action |
|------|--------|
| `src/lib/api/global-search/service.ts` | **Edit** — Tenant scoping, projections, limits, timeout, 15 entity types, scoring |
| `src/app/api/search/route.ts` | **Edit** — Rate limiting, `search:global` permission, suggestions endpoint |
| `src/lib/validation/schemas.ts` | **Edit** — Strengthen `globalSearchSchema` (max 100, allowlist, escape wildcards) |
| `packages/auth/roles.ts` | **Edit** — Add `search:global` permission |
| `packages/db/schema.ts` + `schema.pg.ts` | **Edit** — Add search indexes |
| `drizzle/00XX_global_search_indexes.sql` + `drizzle/postgres/00XX_global_search_indexes.sql` | **Create** — Migration files |
| `src/hooks/use-global-search.ts` | **Create** — Debounced search hook with AbortController, cache, recent searches |
| `src/components/layout/command-palette.tsx` | **Edit** — Entity results, accessibility, focus trap, recent searches, error+retry |
| `src/components/layout/__tests__/command-palette.test.tsx` | **Create** — Keyboard nav, debounce, cancellation, parity |
| `src/lib/api/global-search/types.ts` | **Create** — Shared TS types for search results |
| `packages/shared/src/search-types.ts` | **Create** — **NEW shared package** for TS/Dart parity |
| `src/lib/api/global-search/__tests__/service.test.ts` | **Create** — Tenant isolation, sensitive fields, rate limit, query limits |
| `packages/auth/__tests__/rbac-5tier-matrix.test.ts` | **Edit** — Add `search:global` test |
| `src/app/api/search/__tests__/route.test.ts` | **Create** — Integration: rate limiting, tenant scoping, validation |
| `thaibahive_mobile_app/lib/features/search/` | **Create** — Full module (repository, provider, bottom sheet, models, recent searches) |
| `thaibahive_mobile_app/lib/core/services/keyboard_shortcuts.dart` | **Create** — `Ctrl+K`/`Meta+K` handler |
| `thaibahive_mobile_app/test/features/search/` | **Create** — Widget + unit + provider + e2e tests |
| `thaibahive_mobile_app/test/app/global_search_e2e_test.dart` | **Create** — Cross-platform E2E |
| `packages/shared/__tests__/search-types.test.ts` | **Create** — Parity tests |
| `.planning/phases/phase-5-global-search/PLAN.md` | **Update** — Verification results |

---

## ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Search latency spikes on large tables | Medium | High | **Added indexes** (Commit 1); hard limits ≤20/type; query timeout 5s; consider future FTS/Meilisearch |
| Mobile keyboard shortcut conflicts | Low | Medium | `HardwareKeyboard.instance.addHandler` with priority; test Android/iOS/Web |
| Result relevance across heterogeneous types | Medium | Medium | Simple scoring: exact prefix > contains > fuzzy; per-type boost configurable |
| Cross-platform UX divergence | Low | High | **Shared `packages/shared/src/search-types.ts`** contract; parity tests (Commit 4) |
| **DoS via unbounded queries** | **High** | **Critical** | **Removed `skipPagination`; hard limit 20/type; 5s timeout; rate limit 30/min** (Commit 1) |
| **Tenant data leakage** | **High** | **Critical** | **`resolveScopedInstitutionId` on every query; explicit projections** (Commit 1) |
| **Sensitive field exposure** | **High** | **Critical** | **Column projections exclude secrets** (Commit 1) |
| **Missing rate limiting** | **High** | **High** | **`checkRateLimit` with "search" config (30/min)** (Commit 1) |
| **Missing DB indexes** | **High** | **High** | **Migration adds indexes + pg_trgm GIN for Postgres** (Commit 1) |

---

## 🚫 Anti-Scope (Phase 5 Will NOT Do)

- ❌ Full-text search engine (Meilisearch/Typesense/PostgreSQL FTS) — current ILIKE + indexes + pg_trgm sufficient for MVP; FTS = Phase 6+
- ❌ Search analytics / query logging dashboard
- ❌ Saved searches / alerts
- ❌ Cross-device search history sync (Phase 4 delta pull)
- ❌ Voice search input
- ❌ Search result personalization / ML ranking
- ❌ Global search for non-authenticated users (requires auth)

---

## 📋 Plan Review Checklist

- [x] Plan reviewed by Security/Backend subagent — **9 findings (3 Critical, 3 High, 2 Medium, 1 Low)** — see `SECURITY_REVIEW.md`
- [x] Plan reviewed by Mobile/UX subagent — **9 findings (2 Critical, 5 High, 2 Medium)** — see `MOBILE_UX_REVIEW.md`
- [ ] Plan reviewed by Web/Frontend subagent (CommandPalette integration, SSR/CSR boundary)
- [x] All blocking findings incorporated into Commit 1-5 specifications
- [ ] Tech Lead sign-off
- [ ] QA verification checklist defined (16 gates)

---

## ✅ Sign-Off (Post-Review)

- [ ] Plan review (AGENTS.md rule) — 3 reviewer subagents
- [ ] Tech Lead: Search architecture + cross-platform UX parity reviewed
- [ ] Security: **Tenant scoping enforced; sensitive fields stripped; DoS mitigated; rate limiting added; indexes created; `search:global` permission**
- [ ] QA: Verification checklist ready + **6 additional gates** (tenant isolation, RBAC, rate limit, data leakage, index verification, load test, accessibility, platform parity)
- [ ] UX: CommandPalette entity cards + Mobile SearchBottomSheet approved (with Critical gaps fixed)

---

## 📋 Plan Review Checklist

- [x] Plan reviewed by Security/Backend subagent — **9 findings (3 Critical, 3 High, 2 Medium, 1 Low)** — see `SECURITY_REVIEW.md`
- [x] Plan reviewed by Mobile/UX subagent — **9 findings (2 Critical, 5 High, 2 Medium)** — see `MOBILE_UX_REVIEW.md`
- [ ] Plan reviewed by Web/Frontend subagent (CommandPalette integration, SSR/CSR boundary)
- [x] All blocking findings incorporated into Commit 1-5 specifications
- [ ] Tech Lead sign-off
- [ ] QA verification checklist defined (16 gates)

---

## ✅ Sign-Off (Post-Review)

- [ ] Plan review (AGENTS.md rule) — 3 reviewer subagents
- [ ] Tech Lead: Search architecture + cross-platform UX parity reviewed
- [ ] Security: **Tenant scoping enforced; sensitive fields stripped; DoS mitigated; rate limiting added; indexes created; `search:global` permission**
- [ ] QA: Verification checklist ready + **6 additional gates** (tenant isolation, RBAC, rate limit, data leakage, index verification, load test, accessibility, platform parity)
- [ ] UX: CommandPalette entity cards + Mobile SearchBottomSheet approved (with Critical gaps fixed)