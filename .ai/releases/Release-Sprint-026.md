# Release Certificate: Sprint-026
**Version:** v3.10.0  
**Date:** 2026-08-06  
**Status:** ✅ APPROVED & STABLE

---

## Release Notes
ThaibaHive v3.10.0 delivers the **Workspace Analytics & Business Intelligence Engine**, shifting the platform from transactional operations to analytical support and dashboard systems. It introduces database materialized caches to guarantee sub-second loads, dynamic REST endpoints, on-demand document compilers (PDF & Excel), background queue runners, specialized gauges and area charts, and full offline mobile support with Hive cache stores.

---

## Files Changed

### Backend Core
- [packages/db/schema.ts](file:///d:/ThaibaHive/packages/db/schema.ts) / [schema.pg.ts](file:///d:/ThaibaHive/packages/db/schema.pg.ts) — Appended SQLite & Postgres analytics schemas.
- [src/lib/services/analytics.ts](file:///d:/ThaibaHive/src/lib/services/analytics.ts) — Central Coordinator with DB-materialized caches wrapper.
- [src/lib/services/report-generator.ts](file:///d:/ThaibaHive/src/lib/services/report-generator.ts) — Document compiler saving PDF and Excel exports.
- [src/lib/services/report-queue.ts](file:///d:/ThaibaHive/src/lib/services/report-queue.ts) — Background job runner with concurrency limit of 2.
- [src/lib/export/pdf-formatter.ts](file:///d:/ThaibaHive/src/lib/export/pdf-formatter.ts) — Reverted custom Windows Arial font option mapping, relying on Next.js server config external bundling.
- [src/lib/examinations/report-card-generator.ts](file:///d:/ThaibaHive/src/lib/examinations/report-card-generator.ts) — Reverted Windows Arial path bypasses.
- [next.config.ts](file:///d:/ThaibaHive/next.config.ts) — Added `serverExternalPackages: ["pdfkit"]` to resolve path resolution issues in monorepos.

### API Endpoints
- [src/app/api/analytics/route.ts](file:///d:/ThaibaHive/src/app/api/analytics/route.ts) — Main analytics query endpoint.
- [src/app/api/analytics/compile/route.ts](file:///d:/ThaibaHive/src/app/api/analytics/compile/route.ts) — Manual PDF/Excel compilation.
- [src/app/api/analytics/history/route.ts](file:///d:/ThaibaHive/src/app/api/analytics/history/route.ts) — Export history fetcher.
- [src/app/api/analytics/schedules/route.ts](file:///d:/ThaibaHive/src/app/api/analytics/schedules/route.ts) / [[id]/route.ts](file:///d:/ThaibaHive/src/app/api/analytics/schedules/%5Bid%5D/route.ts) / [trigger/route.ts](file:///d:/ThaibaHive/src/app/api/analytics/schedules/trigger/route.ts) — Automated report schedules management.

### UI & Visualizations
- [src/components/workspaces/widgets/analytics-charts.tsx](file:///d:/ThaibaHive/src/components/workspaces/widgets/analytics-charts.tsx) — Gauge, Area, Bar, and Radar charts.
- [src/components/workspaces/widgets/principal-fee-recovery.tsx](file:///d:/ThaibaHive/src/components/workspaces/widgets/principal-fee-recovery.tsx) — Upgraded fee widget with gauges.
- [src/components/workspaces/widgets/principal-attendance-trends.tsx](file:///d:/ThaibaHive/src/components/workspaces/widgets/principal-attendance-trends.tsx) — Upgraded attendance widget with line trend chart.
- [src/components/workspaces/widgets/teacher-class-attendance.tsx](file:///d:/ThaibaHive/src/components/workspaces/widgets/teacher-class-attendance.tsx) — Upgraded class attendance widget with gauge.
- [src/components/workspaces/widgets/cashier-transaction-tally.tsx](file:///d:/ThaibaHive/src/components/workspaces/widgets/cashier-transaction-tally.tsx) — Upgraded cashier collections widget with flow line chart.
- [src/components/reports/report-builder.tsx](file:///d:/ThaibaHive/src/components/reports/report-builder.tsx) — On-demand custom report compiler panel.
- [src/app/(shell)/workspace/[role]/analytics/page.tsx](file:///d:/ThaibaHive/src/app/(shell)/workspace/[role]/analytics/page.tsx) — BI Analytics tab switching view.

### Mobile Feature Area
- [thaibahive_mobile_app/lib/features/regional/data/analytics_provider.dart](file:///d:/ThaibaHive/thaibahive_mobile_app/lib/features/regional/data/analytics_provider.dart) — Riverpod analytics loading/push sync provider.
- [thaibahive_mobile_app/lib/features/regional/presentation/screens/analytics_dashboard_screen.dart](file:///d:/ThaibaHive/thaibahive_mobile_app/lib/features/regional/presentation/screens/analytics_dashboard_screen.dart) — Mobile layout with CustomPainter.

### Documentation & Registry Logs
- [docs/analytics-bi-engine-guide.md](file:///d:/ThaibaHive/docs/analytics-bi-engine-guide.md) — Technical operating manuals.
- [.ai/08_DECISION_LOG.md](file:///d:/ThaibaHive/.ai/08_DECISION_LOG.md) — Added ADR-012.
- [.ai/FEATURES.md](file:///d:/ThaibaHive/.ai/FEATURES.md) — Feature registries index.
- [.ai/CHANGELOG.md](file:///d:/ThaibaHive/.ai/CHANGELOG.md) — Added changelogs.
- [.ai/PROJECT_STATUS.md](file:///d:/ThaibaHive/.ai/PROJECT_STATUS.md) — Status metric update.

---

## APIs
- `GET /api/analytics` — Fetches dynamic dashboard analytics (e.g. `type=attendance`).
- `POST /api/analytics/compile` — Compiles and triggers immediate export file creation.
- `GET /api/analytics/history` — Lists compile records.
- `GET /api/analytics/schedules` — Lists active scheduled reports.
- `POST /api/analytics/schedules` — Creates a schedule run.
- `PATCH /api/analytics/schedules/[id]` — Edits configurations.
- `DELETE /api/analytics/schedules/[id]` — Deletes schedule.
- `POST /api/analytics/schedules/trigger` — Triggers schedule check sweep.

---

## Database Migrations
- Migration files created under `drizzle/` and applied to SQLite development databases.
- Parity configurations verified on PostgreSQL schemas.
- Healed development database `dev.db` to add missing staff biometric schema columns (`face_embedding`, `fingerprint_hash`, etc.) to prevent test suite user seeding crashes.

---

## Verification & Tests

### Server-Side Tests
- Run `pnpm test src/lib/services/__tests__/analytics.test.ts`
- **Result:** ✅ PASSING (5/5 tests passing successfully)

### E2E Tests
- Run `npx playwright test e2e/workspace-analytics.spec.ts`
- **Result:** ✅ PASSING (2/2 tests passing successfully)

### Build Checks
- Run `pnpm typecheck`
- **Result:** ✅ CLEAN (Exit Code 0)
