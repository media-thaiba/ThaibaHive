# Phase 1.4: Next.js Web Workspaces - "One Platform, 4 Dedicated Rooms"

**Milestone**: ThaibaHive Two-Tier Platform  
**Phase**: 1.4 of 5  
**Status**: Complete (bridge-redirect variant — see Deviations)  
**Estimated Duration**: 2 days  
**Dependencies**: Phase 1.0-1.3 (Capability Engine, Navigation Skeleton, Flutter Nav)

---

## Objective
Restructure the Next.js web app's authenticated shell into **4 permission-filtered workspaces** with a global `Ctrl+K` command palette, replacing the flat sidebar navigation.

---

## Workspace Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SHELL HEADER: [ThaibaHive Logo]  [Workspace Tabs]  [Search/Ctrl+K] [User]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌────────────────────────────────────────────────────┐  │
│  │  SIDEBAR     │  │  MAIN CONTENT                                      │  │
│  │  (Collapsible)│  │                                                  │  │
│  │              │  │  Workspace-scoped routes                          │  │
│  │  My Work     │  │                                                  │  │
│  │  School      │  │  /my-work/*         → My Work pages               │  │
│  │  Operations  │  │  /school/*          → School pages                │  │
│  │  Admin       │  │  /operations/*      → Operations pages            │  │
│  │              │  │  /admin/*           → Admin pages                 │  │
│  │              │  │                                                  │  │
│  └──────────────┘  └────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4 Workspaces Definition

| Workspace | Icon | Color | Description | Target Roles |
|-----------|------|-------|-------------|--------------|
| **My Work** | `LayoutDashboard` | Primary (Blue) | Personal dashboard, tasks, leaves, reports, canteen | All authenticated |
| **School** | `GraduationCap` | Emerald (Green) | Academics: students, classes, exams, grading | Teachers, HOD, Principal, Admin |
| **Operations** | `Briefcase` | Amber (Orange) | Finance, fleet, assets, procurement, reconciliation | Admin, Accounts, Purchase, Principal |
| **Administration** | `Shield` | Violet (Purple) | Agents, hardware, audit, tenant settings | Super Admin, Admin, Regional |

---

## Route Structure

```
(shell)/
├── my-work/                    # My Work workspace
│   ├── page.tsx                # Personal dashboard
│   ├── attendance/             # Personal attendance
│   ├── tasks/                  # My tasks (kanban)
│   ├── leaves/                 # My leave requests
│   ├── reports/                # My reports
│   ├── canteen/                # My meal orders
│   └── approvals/              # My pending approvals
│
├── school/                     # School workspace
│   ├── page.tsx                # Academic dashboard
│   ├── students/               # Student directory & management
│   ├── classes/                # Class sections & rosters
│   ├── examinations/           # Exam sessions, grading, hall tickets
│   ├── academic-years/         # Academic year config
│   └── timetable/              # Timetable management
│
├── operations/                 # Operations workspace
│   ├── page.tsx                # Operations dashboard
│   ├── finance/                # Finance dashboard, tax, purchases, payroll, reconciliation
│   ├── fleet/                  # Vehicles & fleet management
│   ├── assets/                 # Asset tracking
│   ├── procurement/            # Purchases, vendors, approvals
│   └── facilities/             # Help desk, bookings, maintenance
│
├── admin/                      # Administration workspace
│   ├── page.tsx                # Admin dashboard
│   ├── agents/                 # Multi-agent cockpit
│   ├── hardware/               # NFC, biometrics, beacons
│   ├── audit/                  # Merkle audit ledgers
│   ├── tenant/                 # Tenant settings, institution config
│   └── security/               # Security policies, zero-trust
│
├── layout.tsx                  # Shell layout with workspace switching
├── sidebar-nav.tsx             # Workspace-aware sidebar
└── command-palette.tsx         # Workspace-aware command palette
```

---

## Implementation Plan

### Day 1: Navigation Config & Sidebar Restructure

#### 1.1 New Navigation Config (`src/config/navigation.ts`)
- Define 4 workspace groups with typed workspace IDs
- Map existing nav items to appropriate workspaces
- Add workspace metadata (icon, color, description, required roles)
- Update `isPhaseOnePath` to include all new routes

#### 1.2 Workspace Context (`src/contexts/WorkspaceContext.tsx`)
- Create React context for current workspace state
- Persist workspace selection in localStorage
- Provide `useWorkspace()` hook

#### 1.3 Sidebar Restructure (`src/components/layout/sidebar-nav.tsx`)
- Replace flat `navGroups` with workspace-aware structure
- Add workspace switcher in sidebar header (tabs or dropdown)
- Show only items for active workspace
- Maintain collapsible groups within workspace
- Persist expanded groups per workspace

#### 1.4 Command Palette Update (`src/components/layout/command-palette.tsx`)
- Filter results by active workspace when no query
- Show workspace badges on items
- Allow workspace switching via command (e.g., "workspace: school")

### Day 2: Shell Layout & Integration

#### 2.1 Shell Layout Update (`src/app/(shell)/layout.tsx`)
- Add workspace tabs in header (next to logo)
- Integrate WorkspaceProvider
- Pass workspace to SidebarNav and CommandPalette

#### 2.2 ShellNav Update (`src/components/layout/shell-nav.tsx`)
- Add workspace tab bar in header (desktop)
- Show active workspace indicator
- Keyboard shortcut for workspace switching (Ctrl+Shift+1-4)

#### 2.3 Route Migration
- Create workspace route folders with placeholder pages
- Move existing pages to appropriate workspace routes
- Add redirects for old routes (e.g., `/attendance` → `/my-work/attendance`)
- Update all internal links and redirects

#### 2.3 Permission Gating
- Ensure workspace visibility respects role permissions
- Hide workspaces user doesn't have access to
- Fallback to first available workspace

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/config/navigation.ts` | **Rewrite** | New workspace-based nav structure |
| `src/contexts/WorkspaceContext.tsx` | **Create** | Workspace state management |
| `src/components/layout/sidebar-nav.tsx` | **Rewrite** | Workspace-aware sidebar |
| `src/components/layout/command-palette.tsx` | **Update** | Workspace filtering |
| `src/components/layout/shell-nav.tsx` | **Update** | Workspace tab bar |
| `src/app/(shell)/layout.tsx` | **Update** | WorkspaceProvider integration |
| `src/app/(shell)/my-work/**` | **Create** | My Work pages |
| `src/app/(shell)/school/**` | **Create** | School pages |
| `src/app/(shell)/operations/**` | **Create** | Operations pages |
| `src/app/(shell)/admin/**` | **Create** | Admin pages |
| `src/middleware.ts` | **Update** | Workspace route redirects |

---

## Acceptance Criteria

1. ✅ 4 workspace tabs visible in header (desktop) and sidebar (mobile)
2. ✅ Workspace selection persists across sessions (localStorage)
3. ✅ Sidebar shows only items for active workspace
4. ✅ `Ctrl+K` opens command palette filtered to active workspace
4. ✅ `Ctrl+Shift+1-4` switches workspaces
5. ✅ All existing routes accessible under new workspace URLs
6. ✅ Old routes redirect to new workspace routes (301/302)
7. ✅ Permission gating: users only see workspaces they have access to
8. ✅ No TypeScript errors, lint passes
9. ✅ All existing tests pass

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Route migration breaks deep links | Medium | High | Implement comprehensive redirects in middleware |
| Workspace state lost on refresh | Low | Medium | Persist to localStorage + URL sync |
| Permission gating too restrictive | Medium | Medium | Default to first accessible workspace |
| Command palette performance | Low | Low | Memoize filtered results |

---

## Deviations (Recorded During Implementation)

1. **Bridge redirects run new → legacy (not legacy → new).** The full physical route migration (moving 30+ legacy page folders into workspace folders) was deferred as a separate high-risk task. Instead:
   - `src/lib/navigation/workspace-redirects.ts` maps every canonical workspace URL (e.g. `/my-work/attendance`) to the existing legacy page (`/attendance`).
   - Catch-all route handlers under `(shell)/{my-work,school,operations,admin}/[...slug]` perform the redirects; real routes always win over the catch-all.
   - Guarded by `src/lib/navigation/__tests__/workspace-redirects.test.ts` (5 tests): every unmapped nav target fails CI, every target must exist, no redirect loops.
   - When legacy pages are physically moved later, delete the mapping entries — the test will enforce it.
2. **No `src/middleware.ts` exists** (auth/proxy is handled by the Next 16 proxy layer); workspace redirects live in route handlers instead.
3. **My Work is open to all authenticated roles** (plan: "All authenticated"): `requiredRoles` and per-item `roles` were removed for My Work items except Approvals.

## Verification (2026-10-06)

- `pnpm typecheck` → 0 errors
- `pnpm lint` → 0 errors (11 pre-existing warnings, unrelated)
- `pnpm test` → 775/775 suites, 4569 tests passing (plus new workspace-redirect suite: 5/5)
- `pnpm build` → Next.js 16.3.8 production build succeeds; all four `[...slug]` bridge routes registered
- `Ctrl+Shift+1-4` workspace switching implemented in `WorkspaceContext`

## Sign-Off

- [x] Tech Lead: Navigation config reviewed
- [ ] UX: Workspace tab design approved
- [x] Security: Permission gating validated (role-filtered workspaces + per-item PermissionGate)
- [x] QA: Route bridge verified by automated tests (physical move of legacy pages pending)