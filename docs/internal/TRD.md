# Technical Requirements Document (TRD) — ThaibaHive

> **Source of truth for technical architecture & implementation.**  
> Derived directly from `package.json`, `packages/auth/roles.ts`, `packages/auth/session.ts`, `packages/db/schema.ts`, `packages/db/schema.pg.ts`, and the 694 active API route handlers in `src/app/api/`.

---

## 1. System Overview

| Attribute | Specification |
|---|---|
| **Product** | ThaibaHive — Unified Educational Institution Operating System & Staff Platform |
| **Architecture** | Monorepo Next.js 16 (App Router) with co-located API routes & internal packages (`@thaiba/auth`, `@thaiba/db`) |
| **Deployment Target** | Node.js / Vercel (web shell) + SQLite (dev) / PostgreSQL (production cluster) |
| **Scale Target** | 23+ institutions, 800–1,000 concurrent staff, 435 relational tables |
| **Availability Target** | 99.9% uptime, < 500ms API p95, zero-drift dual-dialect schema parity |

---

## 2. Technology Stack (Locked)

All versions locked and verified against repository [`package.json`](file:///d:/ThaibaHive/package.json):

| Layer | Technology | Locked Version | Rationale & Usage |
|---|---|---|---|
| **Framework** | Next.js | `16.3.8` | App Router, Server Components, Route Handlers, Turbopack / Webpack build |
| **Runtime** | React / React-DOM | `19.2.4` | Server Components, Actions, Concurrent Features |
| **Language** | TypeScript | `^5` | Strict mode (`tsc --noEmit`), end-to-end interface contracts |
| **Styling** | Tailwind CSS | `^3.4.19` | Design tokens mapped to CSS variables, dark mode parity |
| **UI Primitives** | Radix UI | `^1.1.x` (`@radix-ui/react-*`) | Accessible primitives (Dialog, Dropdown, Tabs, Tooltip, Popover) |
| **State (Client)** | Zustand | `^5.0.14` | Client-only UI state (sidebar, drawers, active workspace) |
| **State (Server)** | TanStack Query | `^5.101.2` | Caching, deduplication, background invalidation |
| **Forms** | React Hook Form + Zod | `^7.80.0` / `^4.4.3` | Schema validation co-located with forms and API handlers |
| **Database (Dev)** | SQLite (`better-sqlite3`) | `^12.11.1` | Local file-based development (`dev.db`), zero external dependencies |
| **Database (Prod)** | PostgreSQL | `16+` | Production multi-tenant database (Supabase or self-hosted PG cluster) |
| **ORM** | Drizzle ORM / Kit | `^0.45.2` / `^0.31.10` | SQL-first, zero-overhead dual-dialect schema (`schema.ts` / `schema.pg.ts`) |
| **Auth / Crypto** | `jose` / `bcryptjs` | `^6.2.3` / `^3.0.3` | Web Crypto API JWTs (HS256), DPoP tokens, password hashing |
| **Icons** | Lucide React | `^1.23.0` | Consistent, accessible, tree-shakeable icons |
| **Animation** | Framer Motion | `^12.42.2` | Layout animations, page transitions, spring physics |
| **Toasts** | Sonner | `^2.0.7` | Accessible stacked toast notifications |
| **Drag & Drop** | `@dnd-kit/core` | `^6.3.1` | Accessible Kanban task boards and reordering |
| **Unit Testing** | Jest | `^30.4.2` | Runner configured via `jest.config.js` (`pnpm test`) |
| **E2E Testing** | Playwright | `^1.61.1` | Cross-browser automated journeys (`pnpm test:e2e`) |
| **Package Manager** | pnpm | `9.x` / Workspace | Strict monorepo dependency boundaries (`pnpm-workspace.yaml`) |

---

## 3. Monorepo Topology & Architecture Patterns

### 3.1 Workspace Topology

```
ThaibaHive/
├── packages/
│   ├── auth/                       # Canonical Auth & RBAC Package (@thaiba/auth)
│   │   ├── roles.ts                # 16 roles, 403 permissions, hasPermission()
│   │   ├── session.ts              # SessionPayload, createSession(), verifySession()
│   │   ├── institution-scope.ts    # Server-side tenant boundary resolver
│   │   └── dpop.ts                 # DPoP proof verification
│   └── db/                         # Canonical Drizzle Database Package (@thaiba/db)
│       ├── schema.ts               # SQLite canonical schema (435 tables)
│       ├── schema.pg.ts            # PostgreSQL canonical schema (435 tables)
│       └── index.ts                # DB connection singleton
├── src/
│   ├── app/
│   │   ├── (public)/               # Public unauthenticated routes (about, mission, downloads)
│   │   ├── (shell)/                # Authenticated application shell (152 page.tsx routes)
│   │   │   ├── page.tsx            # Personal dashboard (root)
│   │   │   ├── my-work/            # "My Space" workspace (attendance, tasks, leaves, reports)
│   │   │   ├── school/             # "Academics" workspace (students, classes, exams, timetable)
│   │   │   ├── operations/         # "Operations" workspace (finance, fleet, assets, supply)
│   │   │   └── admin/              # "Admin" workspace (agents, hardware, security, staff, sis)
│   │   ├── auth/                   # Authentication routes (login, signup, reset-password)
│   │   └── api/                    # 88 top-level modules, 694 route.ts endpoints
│   ├── components/
│   │   ├── ui/                     # Reusable design primitives (Button, Dialog, Table, Badge)
│   │   ├── layout/                 # Shell, WorkspaceHeader, Sidebar, MobileNav
│   │   └── operations/             # Specialized operational components (Vision, Finance, Twin)
│   ├── config/
│   │   └── navigation.ts           # 4 workspaces, 56 navigation items, permission mappings
│   ├── lib/
│   │   ├── api/auth-guard.ts       # requireAuth() gatekeeper
│   │   ├── validation/schemas.ts   # Zod validation schemas
│   │   └── utils.ts                # cn(), formatting, date helpers
│   └── proxy.ts                    # Edge security headers & route rewrite proxy
├── drizzle/                        # SQLite migration snapshots
└── drizzle/postgres/               # PostgreSQL migration snapshots
```

### 3.2 Data Flow Patterns

#### Pattern A: Standard Authenticated API Mutation (CRUD)
```
Browser / Client Component 
  → fetch("/api/<module>", { method: "POST", body }) 
  → requireAuth(handler, "permission:key")
      ├─ 1. Verify JWT via cookies().get("session") or Authorization header
      ├─ 2. Validate tokenVersion against staff database record
      ├─ 3. Verify RBAC permission via hasPermission(session.role, "permission:key")
      ├─ 4. Resolve institution tenant scope via resolveInstitutionScopeForSession(session, host)
  → Zod safeParse(body) → return 400 on error
  → Drizzle ORM query parameterized with eq(table.institutionId, session.institutionId)
  → Return NextResponse.json({ data: result }, { status: 200 / 201 })
```

#### Pattern B: Authentication & Session Creation
```
User submits /auth/login Form 
  → POST /api/auth/login 
  → Validate email & password via bcrypt.compare() against staff.passwordHash
  → Check staff.status === "active"
  → Issue HS256 JWT containing SessionPayload:
      { staffId, email, role, employeeId, name, tokenVersion, institutionId }
  → Set httpOnly cookie:
      { httpOnly: true, secure: prod, sameSite: "strict", maxAge: 24h (or 7d for remember) }
  → Return JSON response with user profile metadata
```

#### Pattern C: Multi-Workspace Shell Navigation
```
Root Shell Layout ((shell)/layout.tsx)
  → Read active session & user role
  → Filter 4 top-level workspaces:
      • "my-work" (My Space) — accessible to all authenticated roles
      • "school" (Academics) — teacher, hod, principal, admin, super_admin, coordinator, exam_coordinator
      • "operations" (Operations) — purchase, accounts, principal, admin, super_admin, regional_admin
      • "admin" (Admin) — admin, super_admin, regional_admin, regional_auditor
  → Render filtered navigation items matching role & granted permissions
```

---

## 4. Database Schema (435 Tables — Dual Dialect)

ThaibaHive maintains **100% table and column parity** across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`). The database contains **435 relational tables** organized across 14 architectural domains:

| # | Architectural Domain | Table Count | Representative Tables |
|---|---|---|---|
| **1** | **Core Organization & Tenancy** | 6 | `institutions`, `departments`, `sub_departments`, `institution_encryption_keys`, `regional_groups`, `institution_clusters` |
| **2** | **Staff & Identity Management** | 16 | `staff`, `staff_departments`, `staff_institutions`, `staff_availability`, `staff_recognition`, `staff_device_tokens`, `webauthn_credentials`, `credential_challenges`, `identity_sessions`, `device_fingerprints` |
| **3** | **Academics & Student Information** | 18 | `academic_years`, `classes`, `class_sections`, `students`, `guardians`, `student_guardians`, `timetable_slots`, `timetable_entries`, `teacher_substitutions`, `student_enquiries`, `campus_affiliations` |
| **4** | **Attendance, Shifts & Presence** | 14 | `shifts`, `staff_shifts`, `attendance_logs`, `attendance_locations`, `attendance_register`, `biometric_logs`, `presence_logs`, `presence_verification_settings`, `field_work_sessions`, `presence`, `activity_logs` |
| **5** | **Daily Operations (Tasks, Leaves, Reports)** | 7 | `leave_types`, `leave_balances`, `leave_requests`, `tasks`, `task_comments`, `daily_reports`, `daily_report_tasks` |
| **6** | **Communications & Multi-Modal Engagement** | 22 | `announcements`, `announcement_reads`, `events`, `event_rsvps`, `circulars`, `circular_downloads`, `polls`, `poll_responses`, `chat_channels`, `chat_members`, `chat_channel_messages`, `chat_receipts`, `engage_templates`, `engage_messages`, `engage_deliveries`, `engage_chat_sessions` |
| **7** | **Campus Services & Facility Logistics** | 26 | `help_desk_tickets`, `help_desk_comments`, `bookings`, `booking_resources`, `assets`, `asset_service_history`, `vehicles`, `vehicle_bookings`, `vehicle_logs`, `canteen_items`, `canteen_menus`, `canteen_meal_passes`, `visitors`, `visitor_passes`, `gate_logs`, `twin_facilities`, `twin_spaces`, `twin_assets` |
| **8** | **Comprehensive Finance, Supply & Procurement** | 52 | `financial_transactions`, `financial_reconciliations`, `financial_reconciliation_items`, `tax_jurisdictions`, `tax_rate_overrides`, `purchase_approval_tiers`, `purchase_approval_logs`, `payroll_salary_structures`, `payroll_records`, `payroll_deductions`, `fee_structures`, `fee_payments`, `fee_receipts`, `fee_defaulter_logs`, `supply_vendors`, `supply_purchase_orders`, `supply_vendor_invoices`, `supply_three_way_matches`, `alumni_donations`, `alumni_donation_campaigns` |
| **9** | **Examinations, Curricula & Degrees** | 27 | `grade_scales`, `exams`, `exam_schedules`, `hall_tickets`, `mark_entries`, `tabulation_registers`, `curriculum_programs`, `curriculum_courses`, `curriculum_prerequisites`, `curriculum_degree_plans`, `km_degree_programs`, `km_course_prerequisites` |
| **10** | **Autonomous Security, ZASM & SOAR** | 25 | `zasm_device_trust`, `zasm_segmentation_policies`, `zasm_certificates`, `zasm_sbom_packages`, `ares_predictive_threats`, `ares_chaos_experiments`, `ares_zkp_proofs`, `soar_playbooks`, `soar_executions`, `soar_approvals`, `ip_quarantines`, `ip_allowlist` |
| **11** | **Safety, Vision Shield & Smart Microgrid** | 29 | `vision_cameras`, `vision_detection_zones`, `vision_threat_alerts`, `vision_security_incidents`, `vision_guard_profiles`, `vision_alpr_logs`, `vision_lockdown_events`, `eco_energy_assets`, `eco_carbon_emissions`, `eco_ev_charging_stations`, `aims_agents`, `aims_energy_telemetry` |
| **12** | **Neuro Cluster & Research Compute** | 14 | `neuro_clusters`, `neuro_nodes`, `neuro_gpus`, `neuro_jobs`, `neuro_job_checkpoints`, `neuro_fair_share_quotas`, `neuro_spot_price_history`, `neuro_dataset_provenance`, `neuro_compute_billing_accounts`, `neuro_billing_ledger_transactions` |
| **13** | **Autonomous Multi-Agent OS (AIGENT-OS)** | 48 | `agentic_workflows`, `agentic_workflow_runs`, `agentic_workflow_steps`, `agent_approval_gates`, `agent_memory_entries`, `agent_tool_invocations`, `agent_outbox_messages`, `agent_plugins`, `agent_plugin_installations`, `agent_workflow_graphs`, `ai_models`, `ai_agent_swarms`, `swarm_negotiations` |
| **14** | **Cross-Campus Federation, SIS & Data Mesh** | 30 | `sis_connectors`, `sis_sync_runs`, `sis_mapping_queue`, `resource_pools`, `cross_campus_bookings`, `cross_campus_allocations`, `mesh_nodes`, `replication_logs`, `data_lakehouse_jobs`, `federated_policies`, `offline_sync_outbox` |
| **Total** | | **435** | **100% verified table parity across SQLite and PostgreSQL** |

### 4.2 Key Database Conventions
- **Timestamps**: Stored as ISO 8601 UTC strings (`text("created_at")`).
- **Tenant Scope**: Tenant-scoped tables require `institution_id` indexed foreign keys.
- **Audit Integrity**: Cryptographic Merkle hash chaining (`audit_merkle_roots`, `audit_logs`).
- **Schema Parity Assurance**: Enforced via `pnpm db:verify:columns` and `packages/db/__tests__/schema-drift.test.ts`.

---

## 5. Authentication & Authorization (RBAC)

### 5.1 Session Structure (`@thaiba/auth`)
Defined in [`packages/auth/session.ts`](file:///d:/ThaibaHive/packages/auth/session.ts):
```typescript
export type SessionPayload = {
  staffId: string;
  email: string;
  role: StaffRole;
  employeeId: string;
  name: string;
  tokenVersion: number;
  dpopEnabled?: boolean;
  institutionId?: string | null;
};
```
- **Cookie Configuration**: `httpOnly: true`, `secure: true` (in production), `sameSite: "strict"`, `path: "/"`.
- **TTL**: 24 hours standard session; 7 days when `extendSession` ("Remember Me") is requested; 10 minutes for DPoP access tokens.

### 5.2 Complete Staff Roles (16 Roles)
Defined in [`packages/auth/roles.ts`](file:///d:/ThaibaHive/packages/auth/roles.ts):
```typescript
export type StaffRole =
  | "super_admin"          // Global Director Office (wildcard "*" across all permissions)
  | "admin"                // IT & HR Central Administration (386 permissions)
  | "principal"            // Institution Executive (316 permissions)
  | "hod"                  // Department Head (155 permissions)
  | "staff"                // General Staff Employee (104 permissions)
  | "accounts"             // Financial Controller & Cashier (98 permissions)
  | "purchase"             // Procurement Officer (83 permissions)
  | "regional_admin"       // Multi-Campus Regional Administrator (223 permissions)
  | "regional_auditor"     // Independent Compliance Auditor (78 permissions)
  | "coordinator"          // Student Admissions & Activity Coordinator (64 permissions)
  | "institutional_head"   // Campus Division Head (175 permissions)
  | "academic_coordinator" // Curricular & Timetable Coordinator (38 permissions)
  | "exam_coordinator"     // Examination Session Administrator (32 permissions)
  | "teacher"              // Academic Instructor (56 permissions)
  | "inspector"            // Quality Inspection Officer (30 permissions)
  | "system";              // Autonomous background agent daemon (21 permissions)
```

### 5.3 Permission Verification Engine
- **Namespace Total**: **403 distinct permission strings** covering 70+ modules (`staff:*`, `attendance:*`, `tasks:*`, `finance:*`, `vision:*`, `neuro:*`, `agent:*`, `supply:*`, `alumni:*`).
- **Authorization Call**: `hasPermission(session.role, "permission:string")`
- **Legacy Dot-to-Colon Mapping**: Automatic normalization via `DOT_TO_COLON_MAP` (e.g. `student.create` $\leftrightarrow$ `students:create`).
- **Super Admin Wildcard**: Role `"super_admin"` automatically resolves `true` for all permission checks.

### 5.4 Cross-Role Capability Summary

| Functional Area | `super_admin` | `admin` | `principal` | `hod` | `staff` | `accounts` | `purchase` | `regional_admin` | `teacher` |
|---|---|---|---|---|---|---|---|---|---|
| **Staff CRUD** | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| **Attendance Read** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| **Attendance Manage** | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| **Task Create/Assign** | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| **Leaves (Approve)** | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| **Reports (Review)** | ✅ | ✅ | ✅ | ✅ | — | — | — | ✅ | — |
| **Finance (Read/Ledger)**| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Procurement Approvals**| ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | — |
| **Vision Shield Alerts** | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — |
| **Examinations Grading** | ✅ | ✅ | ✅ | ✅ | — | — | — | — | ✅ |
| **System Key Management**| ✅ | — | — | — | — | — | — | — | — |

---

## 6. ⚠️ Database Row-Level Security (RLS) Status

> ### 🚨 CRITICAL SECURITY NOTICE — DATABASE RLS NOT IMPLEMENTED AT DB LAYER
>
> **PostgreSQL Row-Level Security (`ENABLE ROW LEVEL SECURITY` / `CREATE POLICY`) is NOT currently configured or enabled in database migrations or schema files.**
>
> 1. **Current Security Boundary**: All multi-tenancy isolation and permission checks are enforced strictly at the **application layer** via:
>    - `requireAuth(handler, "permission:key")` in API routes.
>    - `resolveInstitutionScopeForSession(session, host)` in `src/lib/api/auth-guard.ts`.
>    - Parameterized queries scoping operations to `eq(table.institutionId, session.institutionId)`.
> 2. **Warning for Developers & Auditors**: **Do NOT assume database queries automatically filter rows by tenant or role.** Direct SQL queries or un-scoped ORM queries without explicit `institutionId` predicates will return cross-tenant data.
> 3. **Planned Roadmap**: PostgreSQL RLS is planned as a future defense-in-depth database hardening phase for dedicated PostgreSQL multi-tenant clusters. When implemented, policies will be defined in `drizzle/postgres/` migrations with companion AST tests.

---

## 7. API Architecture & Endpoint Standards

### 7.1 Inventory Summary
- **Total Route Handlers**: **694 `route.ts` files** across **88 top-level modules** under `src/app/api/`.
- **Protected Handlers**: **638 route files** explicitly wrapped with `requireAuth()` or `withAuth()`.
- **Public & System Endpoints**: Limited to `/api/auth/login`, `/api/auth/signup`, `/api/health`, `/api/openapi.json`, `/api/public/*`, `/api/webhooks/*`, and `/api/verify/*`.

### 7.2 Standard API Signature
```typescript
import { requireAuth } from "@/lib/api/auth-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["todo", "in_progress", "completed"]),
});

export const PATCH = requireAuth(async (request, session, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Database operation scoped by tenant institutionId
  const updated = await db.update(tasks)
    .set({ status: parsed.data.status })
    .where(and(eq(tasks.id, id), eq(tasks.institutionId, session.institutionId!)))
    .returning();

  if (!updated.length) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated[0] });
}, "tasks:update");
```

---

## 8. Frontend & Design System Standards

### 8.1 Workspace Architecture
The application shell implements 4 role-filtered workspaces defined in [`src/config/navigation.ts`](file:///d:/ThaibaHive/src/config/navigation.ts):
1. **My Space (`my-work`)**: 17 navigation routes for personal daily workflows (Dashboard, Attendance, Tasks, Leaves, Reports, Approvals, Canteen, Timeline, Announcements, Events, Circulars, Polls, Chat, Expenses, Availability, Recognition, Grievances).
2. **Academics (`school`)**: 7 navigation routes for academic operations (Dashboard, Students, Classes, Examinations, Academic Years, Timetable, Grades).
3. **Operations (`operations`)**: 19 navigation routes for institutional operations (Finance, Tax Rates, Purchases, Payroll, Reconciliation, Fleet, Assets, Procurement, Facilities, Bookings, Accounts, Media, Workflow Studio, Live Sessions, Conferencing).
4. **Admin (`admin`)**: 13 navigation routes for administrative governance (Dashboard, Agent Cockpit, Hardware, Audit Ledgers, Institutions, Security Center, Keys, Staff Directory, Marketplace, Agent Marketplace, SIS Sync, Cross-Campus Federation).

### 8.2 UI Component & Typography Contracts
- **Prims**: All controls must use `src/components/ui/` primitives. Raw `<input>`, `<select>`, `<button>` tags are prohibited.
- **Typography Standards (Apple Design Principles)**: Base `.micro-label`, secondary metadata, and badge text must be $\ge 11$px (`text-[11px]` or `text-xs`) with balanced letter-spacing (`tracking-wider`). Standalone controls, navigation, and badges must never drop below 11px.
- **Dense Data Exception**: Specialized dense views (finance ledgers, CCTV stream HUDs, telemetry overlays) are explicitly permitted to use `text-[10px]` where compact tabular density is required.
- **Radius Hierarchy**: Concentric radii follow Tailwind standards: `rounded-2xl` shell $\to$ `rounded-xl` cards $\to$ `rounded-lg` controls $\to$ `rounded-md` badges.

---

## 9. Non-Functional Requirements & Verification Gates

| Category | Requirement | Verification Method |
|---|---|---|
| **Type Safety** | Zero TypeScript compilation errors | `pnpm typecheck` (`cross-env NODE_OPTIONS="--max-old-space-size=6144" tsc --noEmit`) |
| **Linting & Code Quality** | Zero ESLint errors | `pnpm lint` (`eslint .`) |
| **Unit & Integration Tests** | 100% test pass rate | `pnpm test` (`jest --passWithNoTests --forceExit`) |
| **E2E Browser Testing** | Automated user journey validation | `pnpm test:e2e` (`playwright test`) |
| **RBAC Security Audit** | Zero unmapped routes or permissions | `pnpm security:rbac` (`tsx scripts/security/rbac-permission-audit.ts`) |
| **Multi-Tenant Boundary Check** | Strict tenant column parity | `pnpm db:verify:columns` (`tsx scripts/db/verify-tenant-columns.ts`) |
| **Schema Dual-Dialect Drift** | 100% column parity across SQLite & PG | `packages/db/__tests__/schema-drift.test.ts` |

---

## 10. Mobile Platform Integration

- **Companion Mobile App**: Built with Flutter in [`thaibahive_mobile_app/`](file:///d:/ThaibaHive/thaibahive_mobile_app) using Riverpod and GoRouter.
- **Web-to-Mobile Nonce Exchange**: Single-use nonce authentication via `/api/auth/mobile-handoff/nonce` for secure WebView cookie injection without credential exposure.
- **Push Notification Infrastructure**: FCM token registration via `/api/auth/fcm-token` and `/api/notifications/device-token`.
- **Offline Synchronization**: Idempotent synchronization via `/api/sync/delta` and `/api/sync/push` backed by `mobile_sync_processed` tracking.
