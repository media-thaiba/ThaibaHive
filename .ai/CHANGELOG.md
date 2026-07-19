# Changelog — ThaibaHive

All notable changes to the ThaibaHive ecosystem are documented here.

## [1.2.0] - 2026-07-19
### Added
- Implemented **Daily Activity Logs (`/reports`)** page with log history, creation/drafting/submission dialog, and linked project tasks with logged hours.
- Implemented **Expense Claims (`/expenses`)** page with category filters, description, amount, receipt file uploading (calling `/api/upload`), and approvals.
- Implemented **Purchase Requests (`/purchases`)** page with procurement submission, visual timeline stepper (Requester -> HOD -> Accounts -> Purchase), and stage approvals.
- Implemented **Institutional Financials (`/accounts`)** page with revenue/operational expenses/balance summary cards, date/institution filters, and a transaction ledger table.
- Added client-side **Tax Rate Overrides** calculator panel in `/accounts` for estimated GST liabilities analysis.
- Modified `/api/export` endpoint to support type `"accounts"`, enabling administrators to download transaction ledgers in CSV format.
- Extended the design system `EmptyState` component to support an optional `onClick` handler action prop.

## [1.1.0] - 2026-07-19
### Changed
- Unlocked 13 Flutter features previously hidden behind `ComingSoonScreen`: events, expenses, purchases, visitors, grievances, vehicles, canteen, checklists, timeline, availability, accounts, admin.
- Updated `router.dart` to wire actual screen implementations instead of placeholders.
- Updated `MoreScreen._unlockedRoutes` to include all 23 features.
### Fixed
- Fixed `UpdateService` constructor error (was passing 2 args to 0-param constructor).
- Fixed `UpdateBanner` parameter mismatch (was passing 3 named params to parameterless widget).
- Removed unused `isDark` variable in `UpdateBanner`.
- Removed unused imports in `router.dart` and `update_provider.dart`.
### Added
- Implemented **AI Context System (AIOS 2.0.0)** under the `.ai/` directory.
- Created `MACHINE_README.md`, `PROJECT_STATE.json`, `START_HERE.md`, `CONTEXT_INDEX.md`, and helper templates.
- Created multi-level `rules/` and `prompts/` configurations.
- Verified all 31 AIOS files present with full content (entry points, memory, governance, rules, prompts, maps, ADRs, archives).
- Updated `CURRENT_TASK.md`, `HANDOFF.md`, and `CHANGELOG.md` to reflect AIOS setup completion.

## [0.3.0] - 2026-07-18
### Added
- Unified 3-Track Roadmap (Web, Mobile, Media).
- Android home screen widgets & Jetpack Glance spec.
- Bookings API Conflict checks and resource schedules.

## [0.2.0] - 2026-07-16
### Added
- Created `circularDownloads` analytics and rate limiting.
- Redesigned `/circulars` and `/polls` client routes with rich visualizations.
- Integrated `localStorage` settings cache for notification preferences.

## [0.1.0] - 2026-07-15
### Added
- Refactored 30+ pages from raw HTML inputs/selects to shadcn/ui custom primitives.
- Integrated Zod schema checks inside API paths.
- Setup Playwright E2E and Jest unit test suites.
