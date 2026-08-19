# Release Notes: Sprint-025 (v3.9.0)

**Release Version:** v3.9.0  
**Focus:** Role-Based Intent-Driven Workspaces  

## Key Enhancements

### 1. Intent-Driven Workspaces
- Transitions ThaibaHive from traditional module-based navigation to personalized, role-specific intent dashboards (Principal, Teacher, Cashier, Parent).
- Dynamically aggregatives core metrics under a single GET `/api/workspaces/data` API call.
- Persists layout preferences (enabled state, widget order) in the database via PUT `/api/workspaces/preferences` with rate-limiting and audit logging.

### 2. Carrier-Resilient Real-Time Updates (SSE)
- Deploys server-sent events stream endpoint GET `/api/workspaces/sse` featuring a 5-second carrier-resilient heartbeat ping.
- Custom hook `useWorkspaceSse` manages WebSocket/EventSource subscriptions on the frontend with automatic exponential backoff reconnects and Rule-82-compliant listener cleanup on unmount.

### 3. Mobile Companion Workspace Integration
- Adds Flutter screens for Principal, Teacher, Cashier, and Parent workspaces.
- Standardizes caching via Riverpod `workspaceStateProvider` mapping to a dedicated Hive storage box `mobile_workspaces_cache`.
- Incorporates `EmbeddedWorkspaceWebView` allowing mobile devices to run standard web workspace layouts with secure, non-intrusive nonce auth handoff.

---

## Changed Files

### Mobile Client (Flutter)
- `thaibahive_mobile_app/lib/features/dashboard/data/workspace_provider.dart` (New Riverpod Provider)
- `thaibahive_mobile_app/lib/features/dashboard/presentation/screens/principal_workspace_screen.dart` (New Screen)
- `thaibahive_mobile_app/lib/features/dashboard/presentation/screens/teacher_workspace_screen.dart` (New Screen)
- `thaibahive_mobile_app/lib/features/dashboard/presentation/screens/cashier_workspace_screen.dart` (New Screen)
- `thaibahive_mobile_app/lib/features/dashboard/presentation/screens/parent_workspace_screen.dart` (New Screen)
- `thaibahive_mobile_app/lib/features/dashboard/presentation/widgets/embedded_workspace_webview.dart` (New Widget)
- `thaibahive_mobile_app/test/features/dashboard/workspace_test.dart` (New Test Suite)

### Next.js API & Web Console
- `packages/db/schema.ts` / `schema.pg.ts` (Preferences Schemas)
- `packages/auth/roles.ts` (Workspace Permissions Setup)
- `src/lib/validation/schemas.ts` (Zod Layout Schemas)
- `src/lib/services/workspace-aggregation.ts` (Aggregation Engine)
- `src/app/api/workspaces/data/route.ts` (Data REST Endpoint)
- `src/app/api/workspaces/preferences/route.ts` (Preferences REST Endpoint)
- `src/app/api/workspaces/sse/route.ts` (SSE Feed Endpoint)
- `src/lib/hooks/use-workspace-sse.ts` (SSE Client Hook)
- `src/components/workspaces/workspace-skeleton.tsx` (Skeleton States)
- `src/components/workspaces/workspace-shell.tsx` (Adaptive Grid Layout Shell)
- `src/components/workspaces/personalization-dialog.tsx` (Preferences Customize Radix Dialog)
- `src/components/workspaces/widgets/principal-attendance-trends.tsx` (Staff Attendance Widget)
- `src/components/workspaces/widgets/principal-fee-recovery.tsx` (Fee Collection Widget)
- `src/components/workspaces/widgets/teacher-class-attendance.tsx` (Schedule Widget)
- `src/components/workspaces/widgets/teacher-homework-tracker.tsx` (Tasks & Homework Widget)
- `src/components/workspaces/widgets/cashier-transaction-tally.tsx` (Tally Widget)
- `src/components/workspaces/widgets/cashier-pending-fees.tsx` (Overdue Fees Widget)
- `src/components/workspaces/widgets/parent-child-attendance.tsx` (Student Attendance Widget)
- `src/components/workspaces/widgets/parent-fee-card.tsx` (Parent Fees Widget)
- `src/app/(shell)/workspace/layout.tsx` (Redirection Layout Wrapper)
- `src/app/(shell)/workspace/[role]/page.tsx` (Role Dashboard Page Routing)
- `src/middleware.ts` (Edge redirection check)
- `src/app/api/workspaces/__tests__/aggregation.test.ts` (Jest Unit Tests)
- `e2e/workspaces-dashboard.spec.ts` (Playwright E2E Spec)

---

## Database Migrations
- SQLite: `drizzle/0019_wet_owl.sql`
- Postgres: `drizzle/postgres/0005_wide_warstar.sql`
- Standardizes layout storage in the `workspace_preferences` table with unique constraint bindings.

---

## Verification Summary
- **Unit & Integration**: Jest tests verify API output models, fallback values, caching headers, and Zod configuration schema constraints. 100% pass (12/12 passing).
- **Security & Redirections**: Playwright specs check security route constraints, verifying 401 returns on unauthenticated API calls and automatic login page redirections.
- **TypeScript**: TypeScript builds compile with 0 compilation errors across all new workspace routes and components.
