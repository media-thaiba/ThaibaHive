# Memory — ThaibaHive Build Status

> **Last updated**: 2026-07-18
> **Current phase**: Phase 3 complete (Admin & Operations) → Ready for Phase 4 (Finance & Reports)
> **Roadmap**: 3-track system — Track A (Web: Ph0–7), Track B (Mobile: M1–M3), Track C (Media: MD1–MD3)

---

## What's Completed

### Phase 0: Foundation ✅

#### Project Setup
- [x] Next.js 16 project with App Router
- [x] TypeScript configuration
- [x] Tailwind CSS with design tokens
- [x] pnpm package manager
- [x] ESLint configuration
- [x] Jest configuration
- [x] Playwright E2E setup
- [x] Environment variables (.env.example)

#### Database
- [x] Drizzle ORM configured (SQLite dev / PostgreSQL prod)
- [x] 30+ tables in `src/db/schema.ts` (754 lines)
- [x] Database connection (`src/db/index.ts`)
- [x] Seed script (`src/db/seed.ts`)
- [x] Dev database (`dev.db`)
- [x] Migration system configured

#### Authentication
- [x] JWT session management (jose)
- [x] Password hashing (bcryptjs)
- [x] Login API (`/api/auth/login`)
- [x] Signup API (`/api/auth/signup`)
- [x] Logout API (`/api/auth/logout`)
- [x] Session verification (`/api/auth/me`)
- [x] Auth context (`AuthContext.tsx`)
- [x] Auth guard middleware (`requireAuth`)
- [x] HTTP-only cookies with secure flags
- [x] WebView Auth Handoff (Phase 2)

#### Role-Based Access Control
- [x] 5 roles defined (super_admin, admin, principal, hod, staff)
- [x] Permission matrix (`src/lib/auth/roles.ts`)
- [x] `hasPermission()` utility
- [x] API route permission checks

#### UI Components
- [x] shadcn/ui component library
- [x] Root layout with Geist font
- [x] Shell layout (header, sidebar, bottom nav)
- [x] Command palette (Cmd+K search)
- [x] Toast notifications (Sonner)
- [x] Diagnostics button
- [x] Theme provider (dark/light mode)
- [x] Query provider (TanStack Query)

#### Pages (Routes Exist)
- [x] Dashboard (`/`)
- [x] Login (`/auth/login`)
- [x] Signup (`/auth/signup`)
- [x] Attendance (`/attendance`)
- [x] Tasks (`/tasks`, `/tasks/new`, `/tasks/[id]`)
- [x] Leaves (`/leaves`)
- [x] Reports (`/reports`)
- [x] Approvals (`/approvals`, `/approvals/delegations`)
- [x] Announcements (`/announcements`)
- [x] Events (`/events`)
- [x] Circulars (`/circulars`)
- [x] Polls (`/polls`)
- [x] Staff Directory (`/staff`, `/staff/new`, `/staff/[id]`, `/staff/[id]/edit`)
- [x] Help Desk (`/help-desk`)
- [x] Bookings (`/bookings`)
- [x] Assets (`/assets`)
- [x] Expenses (`/expenses`)
- [x] Purchases (`/purchases`)
- [x] Accounts (`/accounts`)
- [x] Vehicles (`/vehicles`)
- [x] Canteen (`/canteen`)
- [x] Visitors (`/visitors`)
- [x] Grievances (`/grievances`)
- [x] Recognition (`/recognition`)
- [x] Availability (`/availability`)
- [x] Timeline (`/timeline`)
- [x] Settings (`/settings`)
- [x] Admin - Departments (`/admin/departments`)
- [x] Admin - Sub-departments (`/admin/sub-departments`)
- [x] Admin - Institutions (`/admin/institutions`)
- [x] Admin - Shifts (`/admin/shifts`)
- [x] Admin - Checklists (`/admin/checklists`)

#### API Routes (28 Modules)
- [x] Auth (login, signup, logout, me)
- [x] Staff (CRUD)
- [x] Attendance (CRUD, my attendance)
- [x] Tasks (CRUD, comments)
- [x] Leaves (CRUD, balances)
- [x] Announcements (CRUD, read receipts)
- [x] Events (CRUD, RSVPs)
- [x] Help Desk (CRUD, comments)
- [x] Bookings (CRUD)
- [x] Assets (CRUD, service history)
- [x] Reports (CRUD)
- [x] Approvals (pending items)
- [x] Polls (CRUD, responses)
- [x] Circulars (CRUD)
- [x] Expense Claims (CRUD)
- [x] Purchases (CRUD)
- [x] Accounts (financial data)
- [x] Vehicles (CRUD, bookings, logs)
- [x] Canteen (meal notifications)
- [x] Visitors (CRUD)
- [x] Grievances (CRUD)
- [x] Recognition (CRUD)
- [x] Notifications (CRUD)
- [x] Availability (status)
- [x] Checklists (templates, assignments)
- [x] Export (CSV/Excel)
- [x] Admin (org structure)
- [x] Telemetry

#### Design System
- [x] Color tokens (light + dark mode)
- [x] Typography scale (display, title, label, caption)
- [x] Animation keyframes (fade, slide, scale, pulse)
- [x] Staggered children animation
- [x] Interactive card/row patterns
- [x] Brand surface utilities
- [x] Focus ring accessibility
- [x] Reduced motion support
- [x] Touch target sizing

---

## What's NOT Built Yet

### Functional Gaps
- [ ] NFC/QR attendance scanning not implemented on web/mobile
- [ ] Export functionality may be incomplete
- [ ] Seed data may need enrichment

### Track B: Mobile Platform (Not Started)
- [ ] PWA / mobile web optimization (Phase M1)
- [ ] Native shell and widget bridge (Phase M2)
- [ ] Home screen widgets — Jetpack Glance (Phase M3)
- [ ] Lock screen / Wear OS integrations (Phase M3)

### Track C: Media Platform (Not Started)
- [ ] Media library and upload pipeline (Phase MD1)
- [ ] NAS storage integration (Phase MD2)
- [ ] Production queue management (Phase MD2)
- [ ] Live production sync (Phase MD3)

### Testing
- [x] Unit tests: 25+ written and passing
- [ ] E2E tests: Setup but need additional path coverage

### Infrastructure
- [ ] No CI/CD pipeline
- [ ] No production deployment
- [ ] No monitoring/alerting

---

## Currently Worked On
- **Phase 3: Admin & Operations (Complete)**:
  - Enabled `"staff:read"` on standard staff, allowing directory access.
  - Defined and mapped `"bookings:read"`, `"bookings:create"`, and `"assets:read"` permissions.
  - Updated bookings API routes to prevent overlapping bookings (409 Conflict) and support resource availability calendar GET queries.
  - Polished staff directory page, room booking calendar dashboard, IT help-desk comment thread details, and asset management details.
- **3-Track Roadmap Integration (Complete)**:
  - Added Section 30 to PRD.md: Android Home Screen Widgets & Glanceable Info spec (ThaibaHive + MediaHive widgets, lock screen, Wear OS).
  - Restructured Phasis.md into 3 parallel tracks: Track A (Core Web, Phases 0–7), Track B (Mobile, Phases M1–M3), Track C (Media, Phases MD1–MD3).
  - Updated MASTER_BLUEPRINT.md: 3-track architecture, widget integration strategy, shared storage mapping, security controls.


## Last Modified Files
| File | Last Modified | Purpose |
|------|--------------|---------|
| [PRD.md](file:///d:/ThaibaHive/PRD.md) | 2026-07-18 | Added Section 30: Android Home Screen Widgets & Glanceable Info; renumbered Admin Panel to 31 |
| [Phasis.md](file:///d:/ThaibaHive/Phasis.md) | 2026-07-18 | Restructured into 3 parallel tracks (Web, Mobile, Media) |
| [MASTER_BLUEPRINT.md](file:///d:/ThaibaHive/MASTER_BLUEPRINT.md) | 2026-07-18 | Updated sub-platform architecture, widget integration strategy, security controls |
| [Memory.md](file:///d:/ThaibaHive/Memory.md) | 2026-07-18 | Logged roadmap decisions, widget constraints, 3-track system |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/tasks/page.tsx) | 2026-07-15 | Replaced raw HTML buttons with Button component |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/attendance/page.tsx) | 2026-07-15 | Replaced raw HTML buttons with Button component |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/approvals/page.tsx) | 2026-07-15 | Replaced custom modal overlays with standard Dialog components; hardcoded color maps → Badge variants |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/approvals/delegations/page.tsx) | 2026-07-15 | Replaced custom modal overlays with Dialog; pulse skeletons, hardcoded badge colors |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/assets/page.tsx) | 2026-07-15 | 11 inputs, 7 selects, 7 buttons, 2 textareas, 1 skeleton replaced |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/purchases/page.tsx) | 2026-07-15 | Hardcoded statusColor → Badge variant; form elements replaced |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/grievances/page.tsx) | 2026-07-15 | Form elements and buttons replaced with UI primitives |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/staff/[id]/edit/page.tsx) | 2026-07-15 | Loading skeleton, buttons, select, inputs replaced |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/staff/new/page.tsx) | 2026-07-15 | 7 inputs, 1 select, 2 buttons replaced |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/admin/institutions/page.tsx) | 2026-07-15 | Skeleton, button, inputs, select, delete button replaced |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/admin/departments/page.tsx) | 2026-07-15 | Skeleton, button, inputs, select, delete button replaced |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/admin/sub-departments/page.tsx) | 2026-07-15 | Skeleton, button, inputs, delete button replaced |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/admin/leave-types/page.tsx) | 2026-07-15 | Skeleton import added, pulse loading replaced |
| [build.gradle.kts](file:///d:/ThaibaHive/thaibahive_mobile_app/android/app/build.gradle.kts) | 2026-07-15 | Forced aligned native dependency versions |
| [roles.ts](file:///d:/ThaibaHive/packages/auth/roles.ts) | 2026-07-16 | Added read permissions for Phase 2 |
| [schema.ts](file:///d:/ThaibaHive/packages/db/schema.ts) | 2026-07-16 | Added circularDownloads table |
| [notifications.ts](file:///d:/ThaibaHive/src/lib/api/notifications.ts) | 2026-07-16 | Created targeted auto-notifications dispatcher |
| [route.ts](file:///d:/ThaibaHive/src/app/api/circulars/route.ts) | 2026-07-16 | Refactored circulars API route and permissions |
| [route.ts](file:///d:/ThaibaHive/src/app/api/circulars/[id]/download/route.ts) | 2026-07-16 | Created download tracking with rate limiting |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/circulars/page.tsx) | 2026-07-16 | Premium redesign with dropzone file uploader |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/polls/page.tsx) | 2026-07-16 | Premium poll visualization and voting system |
| [shell-nav.tsx](file:///d:/ThaibaHive/src/components/layout/shell-nav.tsx) | 2026-07-16 | Linked notification dropdown items to target pages |
| [page.tsx](file:///d:/ThaibaHive/src/app/(shell)/settings/page.tsx) | 2026-07-16 | Added local storage notification preferences card |
| [router.dart](file:///d:/ThaibaHive/thaibahive_mobile_app/lib/app/router.dart) | 2026-07-16 | Unlocked Bookings and Assets screen paths |
| [more_screen.dart](file:///d:/ThaibaHive/thaibahive_mobile_app/lib/features/dashboard/presentation/more_screen.dart) | 2026-07-16 | Unlocked Bookings and Assets in navigation registry |

## Blockers
*List any current blockers here.*

| Blocker | Status | Resolution |
|---------|--------|------------|
| — | — | — |

---

## Remaining Phase 1 Items (Antigravity Review — 2026-07-15) ✅ (All Completed)

### 1. Attendance System Polish
- [x] Shift grace period logic: calculate `lateMinutes` from DB shift start + grace period, not mock flags
- [x] Manager team-level attendance filters: department + institution filters for 800+ staff
- [x] Pagination or virtual lists for attendance history (mobile web performance)

### 2. Task Management Polish
- [x] Task comments: join with `staff` table to display author name/avatar
- [x] Task card rank/sortOrder persistence on Kanban drag-and-drop
- [x] Department-scoped task view toggle (My Tasks vs. My Department's Tasks)

### 3. Leave Management Polish
- [x] Validate requested duration against remaining balance before submission
- [x] Multi-stage approval progression: `pending` → HOD → Admin → `approved`/`rejected`

### 4. Dashboard Polish
- [x] Quick Action panel: check-out, quick task drawer, quick leave dialog
- [x] Interactive tooltip walkthrough for new users (replace static notice)

### 5. Testing (Major Gap)
- [x] Unit tests (Jest): grace period calc, leave balance deductions, role-permission checks → `src/lib/__tests__/`
- [x] E2E tests (Playwright): leave application, Kanban drag, checkout flow

---

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-14 | SQLite for dev, PostgreSQL for prod | Zero-config dev, scalable prod |
| 2026-07-14 | JWT over session DB | Stateless, simpler deployment |
| 2026-07-14 | Drizzle over Prisma | Lighter, better SQLite support |
| 2026-07-14 | Radix/shadcn over Headless UI | Better accessibility |
| 2026-07-14 | Zustand over Redux | Less boilerplate |
| 2026-07-14 | Geist font | Clean, modern, free |
| 2026-07-14 | Green primary color | Trustworthy, institutional, warm |
| 2026-07-16 | Immediate notifications | Dispatch alerts directly in POST handler for simplicity |
| 2026-07-16 | Anonymous + Auth download tracking | Log download events for both authenticated and guest users via IP address |
| 2026-07-16 | localStorage notification preferences | Client-side setting toggles to avoid database complexity |
| 2026-07-18 | 3-track parallel roadmap (Web/Mobile/Media) | Allows concurrent development; Track A is foundation, B and C can run in parallel after Phase 2 |
| 2026-07-18 | Jetpack Glance for Android widgets | Declarative Kotlin-based UI; industry standard for Android home screen widgets |
| 2026-07-18 | FCM only (no APNs) for push | Single push provider simplifies infrastructure; iOS not in current scope |
| 2026-07-18 | Android App Links for sensitive deep links | Prevents deep-link hijacking (custom URI schemes are vulnerable); uses `assetlinks.json` verification |
| 2026-07-18 | `androidx.biometric:biometric` library | Supports back to Android 6.0 (API 23); avoids raw SDK constraints |
| 2026-07-18 | Technology-agnostic mobile terminology | "Companion app" and "native widget bridge" used instead of Flutter-specific terms until Phase M2 finalizes stack |
| 2026-07-18 | WorkManager min 15-min widget sync | System-enforced minimum for periodic background work; FCM used for real-time |
| 2026-07-18 | 30-min staleness threshold for widgets | Balance between freshness and battery/data usage; amber badge for stale data |
| 2026-07-18 | Widget data via Room DB cache (not direct network) | Security: widget processes cannot access Keystore tokens; companion app pre-fetches data |
| 2026-07-18 | Smart Widget Engine (multi-instance) | Users configure per-instance modules (Tasks, Calendar, etc.); saved per launcher instance ID |
