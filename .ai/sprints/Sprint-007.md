# Implementation Contract: Sprint-007 Admin Module Performance Reviews & MVP Production Staging

**Sprint ID:** SIS-PARENT-007 (ADM-MVP-007)  
**Sprint Name:** Admin Module Performance Reviews & MVP Production Staging  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-31  
**Target Execution:** 2026-08-06 to 2026-08-13  
**Estimated Duration:** 7–9 days (50–65 hours)  
**Risk Level:** Medium  
**Classification:** AIOS v3.0 Official Implementation Contract  
**Target Release Version:** v1.9.0 (100% MVP Milestone)  

---

## Executive Summary

Sprint-007 delivers the **Admin Module Performance Reviews & MVP Production Staging**, completing the final 5% of product scope required to achieve **100% MVP completion** for ThaibaHive. Following successful completion of Sprint-006 (Services Module & Campus Operations, v1.8.0), this sprint elevates the Human Resources domain from 50% to 100% completion by digitizing staff performance evaluations, review workflow automation, staff self-service development planning, and executive HR analytics. Additionally, Sprint-007 executes end-to-end multi-tenant production staging validation across all 23+ campuses to certify complete platform readiness for commercial launch.

**Key Business Impact:**
- **50% Reduction in HR Administrative Overhead:** Automated evaluation workflows, form builders, and digital review cycles eliminate manual paper-based reviews across all institution typologies.
- **100% Staff Lifecycle Coverage:** Completes the employee management lifecycle from recruitment and attendance tracking to quarterly evaluations and professional growth plans.
- **70% Faster Review Completion:** Automated deadline notifications via FCM/APNs and email keep evaluators and staff aligned without manual tracking.
- **100% MVP Production Readiness:** Rigorous multi-tenant staging validation (security isolation, stress load testing, zero build/type/lint errors) guarantees zero-risk production deployment.

**Strategic Alignment:**
- Advances product completion from ~95% to **100% MVP Readiness**.
- Reuses **Sprint-003 Multi-Stage Approval Engine** mechanics for performance review approval and sign-off flows.
- Extends **Sprint-002 Export Engine** for encrypted PDF performance appraisals, XLSX department summaries, and CSV audit logs.
- Leverages **Sprint-005 Mobile Companion Infrastructure** (Riverpod, `FlutterSecureStorage`) for staff self-service goal tracking on mobile.
- Reuses **Sprint-006 Notification Architecture** (FCM/APNs triggers) for automated review deadline reminders.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation
The Sprint-007 specification is **technically sound, highly feasible, and architecturally aligned**. The foundation for performance reviews builds naturally upon existing core capabilities:
- Dual-dialect Drizzle ORM setup (`packages/db/schema.ts` for SQLite dev and `packages/db/schema.pg.ts` for PostgreSQL prod).
- Established RBAC permission wrapper (`requireAuth`) supporting tenant-isolated queries in `@thaiba/auth`.
- Modular UI component library and Radix UI primitives in `src/components/ui/`.
- Multi-format export engine (`pdf-lib`, `xlsx`, `csv`) ready for performance appraisal certificate generation.

### Technical Assessment & Risks Identified

1. **Flexible Multi-Tenant Competency Framework Configurator**
   - *Challenge:* Different institution typologies (schools, universities, hostels, NGOs) require distinct performance metrics and scoring rubrics.
   - *Mitigation:* Implement JSON-configurable competency framework templates with custom department metric schemas, stored with strict validation rules in Drizzle ORM.

2. **Tamper-Proof Multi-Stage Review State Machine**
   - *Challenge:* Preventing modifications to self-assessments or manager scores after sign-off or phase transition.
   - *Mitigation:* Enforce strict state machine transitions (`draft` → `self_assessment` → `manager_review` → `hr_approval` → `completed`) inside ACID database transactions (`db.transaction`), freezing submitted scores with cryptographic checksums.

3. **Multi-Tenant Data Isolation under Heavy Staging Load**
   - *Challenge:* Ensuring performance review metrics and staff records from Campus A never leak into Campus B during multi-tenant staging load tests.
   - *Mitigation:* Mandate `institutionId` filter checks on all ORM queries and run automated security test matrices enforcing multi-tenant isolation under concurrent load.

4. **Mobile Staff Performance Sync & Push Reminders**
   - *Challenge:* Ensuring staff members receive timely review alerts and can access evaluation summaries on mobile devices seamlessly.
   - *Mitigation:* Re-use Sprint-005 mobile API pattern with nonces and Riverpod state management in `thaibahive_mobile_app`.

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule**, this contract was submitted to **Qwen**, **OpenCode (Local-Ollama)**, and **Claude Code** for peer review and optimization. The following enhancements were incorporated into the contract:

1. **Granular State Machine Security (OpenCode / Ollama):** Enforced immutable score locking upon submission (`ADM-005`) with audit trails to prevent retrospective score tampering during performance reviews.
2. **Dynamic Form Schema Validation (Claude Code):** Required Zod runtime validation (`ADM-002`) for custom metric weightings and range bounds (e.g. 1-5 rating scales) to eliminate corrupt metric entries in the form builder.
3. **Automated Deadline Notification Triggers (Qwen):** Included task `ADM-010` establishing scheduled push/email notification triggers for pending self-assessments and overdue manager evaluations.
4. **Side-by-Side Self vs Manager Score Analytics (OpenCode):** Required side-by-side comparative views in `ADM-007` to highlight evaluation discrepancies and support objective HOD review sessions.
5. **Multi-Tenant Staging Stress Load Testing (Qwen & OpenCode):** Added dedicated task `ADM-013` to simulate high-frequency multi-tenant API traffic and heavy PDF export loads across 23+ campuses prior to MVP release certification.

---

## Scope & Out of Scope

### In Scope

1. **Database Schema & Permission Extensions:**
   - Define Drizzle ORM schemas for `performance_cycles`, `competency_frameworks`, `evaluation_forms`, `performance_reviews`, `performance_goals`, `360_feedback_requests`, and `development_plans` in `packages/db/schema.ts` and `schema.pg.ts`.
   - Extend `@thaiba/auth` RBAC matrix with `performance:read`, `performance:manage`, `performance:evaluate`, and `performance:self` permissions.

2. **HR Administration & Evaluation Form Builder:**
   - Web management dashboard (`/admin/performance`) for configuring competency frameworks, metric scoring rules, evaluation form templates, and review cycle scheduling.
   - Assigning evaluators (HODs, Principals, Peer reviewers) to staff rosters.

3. **Multi-Stage Review Workflow Engine:**
   - Backend state machine processing Self-Assessments, Manager Ratings, 360-Degree Feedback collection, HR Approvals, and Employee Sign-offs (`/api/admin/performance/reviews`).
   - Atomic transaction handling and score locking upon phase transition.

4. **Staff Self-Service & Manager Evaluation Web Portals:**
   - Staff Portal (`/staff/performance`) for submitting self-evaluations, setting quarterly goals, and viewing performance history.
   - Manager Portal (`/admin/performance/evaluate`) for scoring subordinates side-by-side with self-assessments and drafting professional development plans.

5. **Executive HR Analytics & Performance Exports:**
   - Executive dashboard (`/admin/performance/analytics`) rendering campus performance heatmaps, department grade distribution curves, skill gap matrix, and labor compliance audit logs.
   - Export engine integration (`/api/export/performance`) generating PDF performance appraisal certificates, XLSX department summaries, and CSV audit logs.

6. **Mobile Staff Companion Experience:**
   - Flutter mobile screens (`thaibahive_mobile_app/lib/features/performance/`) for staff to track quarterly goals, view evaluation summaries, and receive review deadline push notifications.

7. **Multi-Tenant MVP Production Staging Validation:**
   - Comprehensive multi-tenant security test suite (`multi-tenant-staging-security.test.ts`) validating tenant isolation across all 7 platform domains.
   - Staging load and stress test suite (`multi-tenant-staging-performance.test.ts`) verifying sub-second response times and memory stability under 23+ campus load.
   - Documentation updates (`docs/admin-performance-review-guide.md`, `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`).

### Explicitly Out of Scope

- Automated AI generation of employee performance feedback comments (deferred to post-MVP AI analytics phase).
- Direct payroll monetary bonus calculation logic; evaluation scores provide input data to the Finance module ledger without replacing manual compensation decisions.
- Third-party HRIS system legacy integrations (e.g. Workday/SAP syncing); native REST APIs and CSV/XLSX exports serve as the primary integration boundary.

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Score Tampering After Review Phase Completion** | High | Low | Lock scores with immutable state machine transitions and audit trail signatures in `db.transaction`. |
| **Multi-Tenant Performance Data Leakage** | High | Low | Enforce mandatory `where(eq(table.institutionId, user.institutionId))` filter checks on all ORM queries and run automated staging security tests. |
| **Custom Competency Metric Schema Corruption** | Medium | Medium | Validate form template metric schemas strictly using Zod validation schemas prior to database insertion. |
| **Notification Spam for Review Deadlines** | Medium | Low | Implement idempotency keys and notification deduplication checks in the notification engine (`ADM-010`). |
| **Staging Load Timeout during Bulk PDF Export** | Medium | Medium | Stream PDF buffer generation asynchronously and apply row pagination limits (< 1,000 records per batch). |

---

## Rollback Strategy

In the event of critical failures during deployment of Sprint-007:

1. **Feature Flag Deactivation:** Set `NEXT_PUBLIC_PERFORMANCE_MODULE_ENABLED=false` in environment config to gracefully hide performance review routes with a maintenance notice.
2. **Schema Compatibility Preservation:** All schema modifications in `packages/db/schema.ts` and `schema.pg.ts` are strictly additive (7 new performance tables). No existing tables will be modified or dropped.
3. **API Graceful Degradation:** Performance review endpoints return HTTP 503 if feature flag is disabled, preserving all academic, examination, finance, mobile, and services functionality.
4. **Mobile App Fallback:** Mobile companion app gracefully hides performance review cards if backend APIs indicate module inactivity.

---

## Implementation Tasks

The sprint is broken down into **14 sequential implementation tasks**:

```
ADM-001 ──► ADM-002 ──► ADM-003 ──► ADM-004 ──► ADM-005 ──► ADM-006 ──► ADM-007
                                                 │
                                                 ├──► ADM-008 ──► ADM-009
                                                 │
                                                 └──► ADM-010 ──► ADM-011 ──► ADM-012 ──► ADM-013 ──► ADM-014
```

---

### Task ADM-001: Database Schema Extensions for Performance Reviews & HR Development

- **Task ID:** ADM-001
- **Description:** Extend Drizzle ORM schemas in both SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) to support Performance Review Cycles (`performance_cycles`), Competency Frameworks (`competency_frameworks`), Evaluation Forms (`evaluation_forms`), Staff Performance Reviews (`performance_reviews`), Staff Goals (`performance_goals`), 360-Degree Feedback (`feedback_requests`), and Development Plans (`development_plans`).
- **Files:**
  - `[MODIFY] packages/db/schema.ts`
  - `[MODIFY] packages/db/schema.pg.ts`
  - `[MODIFY] packages/db/index.ts`
- **Dependencies:** None
- **Acceptance Criteria:**
  1. All 7 new database tables defined with proper column types, foreign keys, timestamps, and `institutionId` indexes.
  2. Dual-dialect parity strictly maintained between SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
  3. Package exports updated in `packages/db/index.ts` without breaking existing imports.
  4. Type generation succeeds without TypeScript or Drizzle schema errors.
- **Verification Method:** Run `pnpm --filter @thaiba/db build` and `pnpm typecheck`.
- **Estimated Complexity:** Medium (1 day)

---

### Task ADM-002: Validation Schemas & RBAC Permission Matrix Extensions

- **Task ID:** ADM-002
- **Description:** Create Zod validation schemas in `src/lib/validation/schemas.ts` for all performance review request payloads and update `@thaiba/auth` RBAC definitions to include granular permission scopes (`performance:read`, `performance:manage`, `performance:evaluate`, `performance:self`).
- **Files:**
  - `[MODIFY] src/lib/validation/schemas.ts`
  - `[MODIFY] packages/auth/src/permissions.ts`
  - `[MODIFY] packages/auth/src/types.ts`
  - `[NEW] src/lib/__tests__/performance-validation.test.ts`
- **Dependencies:** ADM-001
- **Acceptance Criteria:**
  1. Zod validation schemas defined for competency metric creation, evaluation form templates, review cycle setup, self-assessment submissions, manager score entries, and goal setting.
  2. `@thaiba/auth` re-exports permission constants and role mappings for `super_admin`, `admin`, `principal`, `hod`, and `staff`.
  3. Validation unit test suite passes cleanly, validating score boundary limits (e.g. 1-5 ratings) and text input sanitization.
- **Verification Method:** Run `pnpm test src/lib/__tests__/performance-validation.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task ADM-003: Performance Evaluation Forms & Competency Framework REST APIs

- **Task ID:** ADM-003
- **Description:** Implement backend REST API route handlers under `/api/admin/performance/` for managing competency frameworks, custom department metrics, evaluation form templates, and review cycle scheduling.
- **Files:**
  - `[NEW] src/app/api/admin/performance/frameworks/route.ts`
  - `[NEW] src/app/api/admin/performance/forms/route.ts`
  - `[NEW] src/app/api/admin/performance/cycles/route.ts`
  - `[NEW] src/app/api/admin/performance/__tests__/frameworks-api.test.ts`
- **Dependencies:** ADM-001, ADM-002
- **Acceptance Criteria:**
  1. `GET/POST /api/admin/performance/frameworks` manages competency framework rubrics per institution.
  2. `POST /api/admin/performance/cycles` creates review cycles with start/end deadlines and target staff rosters.
  3. All endpoints validate request bodies with Zod and enforce `requireAuth` with `institutionId` tenant isolation.
  4. Unit test suite verifies framework creation and review cycle state transitions (`draft` → `active`).
- **Verification Method:** Run `pnpm test src/app/api/admin/performance/__tests__/frameworks-api.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task ADM-004: HR Performance Administration & Review Cycle Web Dashboard

- **Task ID:** ADM-004
- **Description:** Develop the web administration dashboard in `src/app/(shell)/admin/performance/page.tsx` for HR managers to configure frameworks, build evaluation form templates, schedule review cycles, and monitor completion progress.
- **Files:**
  - `[NEW] src/app/(shell)/admin/performance/page.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/cycle-manager.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/framework-builder.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/form-template-modal.tsx`
- **Dependencies:** ADM-003
- **Acceptance Criteria:**
  1. Renders active review cycle overview cards (Active Cycles, Total Staff Evaluated, Completion Rate, Pending Approvals).
  2. Uses UI primitives (`<Button>`, `<Dialog>`, `<Badge>`, `<Skeleton>`, `<Alert>`) per `AGENTS.md` guidelines.
  3. HR managers can build form templates with dynamic metric weighting and assign evaluators.
  4. Includes error boundaries and empty state components for cycles and frameworks.
- **Verification Method:** Run `pnpm build` and verify web interface in browser.
- **Estimated Complexity:** High (1 day)

---

### Task ADM-005: Review Workflow Engine & Multi-Stage Evaluation Service

- **Task ID:** ADM-005
- **Description:** Build the core review workflow service managing state transitions (Self-Assessment → Evaluator Rating → 360 Feedback → HR Approval → Staff Sign-off) with atomic SQL transactions and score locking.
- **Files:**
  - `[NEW] src/lib/performance/review-workflow-service.ts`
  - `[NEW] src/app/api/admin/performance/reviews/route.ts`
  - `[NEW] src/app/api/admin/performance/reviews/[id]/submit/route.ts`
  - `[NEW] src/lib/performance/__tests__/review-workflow.test.ts`
- **Dependencies:** ADM-003
- **Acceptance Criteria:**
  1. `ReviewWorkflowService` handles evaluation state machine transitions inside `db.transaction`.
  2. Scores are finalized and locked upon submission, returning error HTTP 400 if attempting edit on completed phases.
  3. Supports optional 360-degree feedback aggregation from peer evaluators.
  4. Unit tests verify state machine transition validity, score calculation math, and lock enforcement.
- **Verification Method:** Run `pnpm test src/lib/performance/__tests__/review-workflow.test.ts`.
- **Estimated Complexity:** High (1.5 days)

---

### Task ADM-006: Staff Self-Service Performance Portal Web Interface

- **Task ID:** ADM-006
- **Description:** Develop staff self-service portal in `src/app/(shell)/staff/performance/page.tsx` enabling teachers and staff to complete self-evaluations, set quarterly goals, track progress, and review signed appraisal records.
- **Files:**
  - `[NEW] src/app/(shell)/staff/performance/page.tsx`
  - `[NEW] src/app/(shell)/staff/performance/_components/self-assessment-form.tsx`
  - `[NEW] src/app/(shell)/staff/performance/_components/goal-tracker.tsx`
  - `[NEW] src/app/(shell)/staff/performance/_components/review-history.tsx`
- **Dependencies:** ADM-005
- **Acceptance Criteria:**
  1. Staff can fill out self-assessment form for active review cycles with draft auto-saving.
  2. Staff can define quarterly professional development goals with status progress bars.
  3. Displays historical evaluation records and transparent feedback after HR sign-off.
  4. Uses `ensureArray` and UI primitives per `AGENTS.md` rules.
- **Verification Method:** Run `pnpm build` and verify staff portal UI workflow.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task ADM-007: Manager & HOD Evaluation Interface

- **Task ID:** ADM-007
- **Description:** Build web evaluation workspace for HODs, Principals, and HR Managers to assess staff performance side-by-side with self-evaluations, enter ratings, and draft development plans.
- **Files:**
  - `[NEW] src/app/(shell)/admin/performance/evaluate/page.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/manager-evaluation-form.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/360-feedback-collector.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/development-plan-editor.tsx`
- **Dependencies:** ADM-005, ADM-006
- **Acceptance Criteria:**
  1. Side-by-side comparative layout rendering staff self-scores alongside manager rating inputs.
  2. Automatic category score weighting calculation and overall rating computation.
  3. Professional development plan editor for recording training recommendations and action items.
  4. Evaluators can submit completed evaluations directly into the HR approval queue.
- **Verification Method:** Run `pnpm build` and verify evaluator interface in browser.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task ADM-008: Executive HR Performance Analytics & Compliance Dashboard

- **Task ID:** ADM-008
- **Description:** Develop real-time HR analytics API and executive dashboard providing campus performance heatmaps, department grade distribution curves, skill gap matrix, and labor compliance audit logs.
- **Files:**
  - `[NEW] src/app/api/admin/performance/analytics/route.ts`
  - `[NEW] src/app/(shell)/admin/performance/analytics/page.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/performance-heatmap.tsx`
  - `[NEW] src/app/(shell)/admin/performance/_components/department-comparison-chart.tsx`
- **Dependencies:** ADM-005, ADM-007
- **Acceptance Criteria:**
  1. `GET /api/admin/performance/analytics` computes department score averages, rating distributions, and evaluation completion metrics.
  2. Executive dashboard renders visual performance distribution heatmaps and department ranking tables.
  3. Compliance audit view displays review completion status against institutional regulatory requirements.
  4. Fast query execution (<1s) across thousands of employee evaluation records.
- **Verification Method:** Test analytics API query performance and verify dashboard UI render.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task ADM-009: Performance Review Export Engine Integration (CSV/XLSX/PDF)

- **Task ID:** ADM-009
- **Description:** Extend Sprint-002 Export Engine to generate official PDF performance appraisal certificates, individual review summaries, department XLSX reports, and audit CSV logs.
- **Files:**
  - `[NEW] src/app/api/export/performance/route.ts`
  - `[NEW] src/lib/export/__tests__/performance-export.test.ts`
- **Dependencies:** ADM-005, ADM-008
- **Acceptance Criteria:**
  1. `POST /api/export/performance` generates encrypted PDF appraisal summaries with institution header, scores, and signature blocks.
  2. Generates multi-tab XLSX spreadsheets containing department rating breakdowns and goal progress logs.
  3. Enforces DDE Formula Injection Sanitization on all CSV/XLSX string values.
  4. Export response generated in <2s for up to 1,000 review records.
- **Verification Method:** Run `pnpm test src/lib/export/__tests__/performance-export.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task ADM-010: Notification Engine & Automated Review Deadline Reminders

- **Task ID:** ADM-010
- **Description:** Integrate FCM/APNs and email notification channels for review cycle announcements, pending self-assessment alerts, evaluation deadline reminders, and sign-off notifications.
- **Files:**
  - `[NEW] src/lib/notifications/performance-notifications.ts`
  - `[NEW] src/app/api/notifications/performance/remind/route.ts`
  - `[NEW] src/lib/notifications/__tests__/performance-notifications.test.ts`
- **Dependencies:** ADM-005
- **Acceptance Criteria:**
  1. Automated reminder service triggers notifications for overdue self-assessments and pending manager evaluations.
  2. Substitutes dynamic parameters (employee name, due date, review cycle title) cleanly into notification templates.
  3. Idempotency checks prevent duplicate reminders within a 24-hour window.
  4. Unit test suite validates notification payload construction and recipient filtering.
- **Verification Method:** Run `pnpm test src/lib/notifications/__tests__/performance-notifications.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task ADM-011: Mobile Staff Self-Service Performance Experience (Flutter)

- **Task ID:** ADM-011
- **Description:** Build Flutter mobile UI screens and Riverpod state providers for staff to view evaluation summaries, track personal quarterly goals, submit quick self-reflections, and receive push notifications on mobile devices.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/performance/providers/performance_provider.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/performance/screens/staff_performance_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/performance/widgets/goal_card.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/performance/widgets/evaluation_summary_card.dart`
  - `[NEW] src/app/api/mobile/v1/staff/performance/route.ts`
- **Dependencies:** ADM-005, ADM-006, ADM-010
- **Acceptance Criteria:**
  1. `StaffPerformanceScreen` displays active review status, current goals, and latest appraisal ratings.
  2. Mobile endpoint `/api/mobile/v1/staff/performance` delivers staff evaluation summary JSON payload.
  3. Follows Flutter conventions (`ConsumerWidget`, `@freezed` models, `FlutterSecureStorage`).
  4. `flutter analyze` inside `thaibahive_mobile_app/` completes with 0 errors and 0 strict warnings.
- **Verification Method:** Run `flutter analyze` inside `thaibahive_mobile_app/` and test mobile UI rendering.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task ADM-012: Comprehensive Multi-Tenant Staging Isolation & Security Audit Suite

- **Task ID:** ADM-012
- **Description:** Author automated multi-tenant security verification test suite executing across all institution typologies (schools, universities, hostels, NGOs), validating zero cross-tenant data leakage, strict RBAC enforcement, and header security across all core modules.
- **Files:**
  - `[NEW] src/app/api/admin/__tests__/multi-tenant-staging-security.test.ts`
- **Dependencies:** ADM-001 through ADM-011
- **Acceptance Criteria:**
  1. 100% pass rate across multi-tenant RBAC matrix test scenarios.
  2. Rejects unauthorized access attempts for `performance:manage` and `performance:evaluate` with HTTP 403 Forbidden.
  3. Verifies user from Institution A cannot query or modify performance reviews, canteen wallets, exam grades, or visitor logs from Institution B.
  4. SQL injection and XSS payloads in feedback text fields are sanitized cleanly.
- **Verification Method:** Run `pnpm test src/app/api/admin/__tests__/multi-tenant-staging-security.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task ADM-013: Multi-Tenant Staging Load & Performance Stress Test Suite

- **Task ID:** ADM-013
- **Description:** Build production staging load and performance stress test suite simulating concurrent multi-campus traffic (5,000 active staff/students, simultaneous export generation, high-frequency canteen/gate pass redemption, exam tabulation, and performance review submissions).
- **Files:**
  - `[NEW] src/app/api/admin/__tests__/multi-tenant-staging-performance.test.ts`
- **Dependencies:** ADM-001 through ADM-012
- **Acceptance Criteria:**
  1. API response times <500ms for 95% of requests under multi-tenant load.
  2. Export generation completes in <2s for 5,000 rows.
  3. Zero database connection pool exhaustion or memory leaks under simulated load.
  4. Identifies and certifies system stability for 100% MVP production release.
- **Verification Method:** Run `pnpm test src/app/api/admin/__tests__/multi-tenant-staging-performance.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task ADM-014: Full MVP Verification, Staging Readiness Certification & AIOS Registry Sync

- **Task ID:** ADM-014
- **Description:** Conduct complete system build & test verification, author comprehensive Admin Module Performance Review documentation, update project status tracking files, and issue v1.9.0 release certification.
- **Files:**
  - `[NEW] docs/admin-performance-review-guide.md`
  - `[MODIFY] .ai/FEATURES.md`
  - `[MODIFY] .ai/CHANGELOG.md`
  - `[MODIFY] .ai/PROJECT_STATUS.md`
- **Dependencies:** ADM-001 through ADM-013
- **Acceptance Criteria:**
  1. Full automated build (`pnpm build`) and typecheck (`pnpm typecheck`) succeed with **0 errors**.
  2. `flutter analyze` inside `thaibahive_mobile_app/` completes with **0 errors and 0 strict warnings**.
  3. `docs/admin-performance-review-guide.md` created detailing performance review setup, framework configuration, staff self-service, and mobile app usage.
  4. `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` updated reflecting **v1.9.0 release status (100% MVP complete)**.
- **Verification Method:** Run full workspace validation script and inspect documentation.
- **Estimated Complexity:** Medium (1 day)

---

## Detailed Specifications

### Database Table Schemas

#### 1. Table: `performance_cycles`
```typescript
export const performanceCycles = sqliteTable("performance_cycles", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  title: text("title").notNull(), // e.g. "2026 Q3 Staff Appraisal"
  cycleType: text("cycle_type").notNull().default("quarterly"), // annual | semi_annual | quarterly
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  selfAssessmentDeadline: text("self_assessment_deadline").notNull(),
  managerReviewDeadline: text("manager_review_deadline").notNull(),
  status: text("status").notNull().default("draft"), // draft | active | in_review | completed | archived
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

#### 2. Table: `performance_reviews`
```typescript
export const performanceReviews = sqliteTable("performance_reviews", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  cycleId: text("cycle_id").notNull().references(() => performanceCycles.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  evaluatorStaffId: text("evaluator_staff_id").notNull().references(() => staff.id),
  formTemplateId: text("form_template_id").notNull(),
  selfScore: real("self_score"),
  managerScore: real("manager_score"),
  finalScore: real("final_score"),
  grade: text("grade"), // A+ | A | B | C | D
  status: text("status").notNull().default("self_assessment"), // self_assessment | manager_review | hr_approval | completed | signed_off
  selfComments: text("self_comments"),
  managerComments: text("manager_comments"),
  submittedAt: text("submitted_at"),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

#### 3. Table: `performance_goals`
```typescript
export const performanceGoals = sqliteTable("performance_goals", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  reviewId: text("review_id").references(() => performanceReviews.id),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date").notNull(),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  status: text("status").notNull().default("in_progress"), // in_progress | completed | deferred
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

---

### Key API Endpoint Specs

#### 1. Endpoint: `POST /api/admin/performance/reviews/[id]/submit`
- **Description:** Submit score evaluation and transition review state machine.
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Request Body:**
  ```json
  {
    "stage": "manager_review",
    "ratings": [
      { "metricId": "met_001", "score": 4.5, "comments": "Exceeds expectations in curriculum delivery." },
      { "metricId": "met_002", "score": 4.0, "comments": "Strong student engagement." }
    ],
    "overallComments": "Outstanding performance this quarter.",
    "recommendedGrade": "A"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "reviewId": "rev_99182",
    "previousStatus": "manager_review",
    "newStatus": "hr_approval",
    "computedFinalScore": 4.25,
    "grade": "A",
    "updatedAt": "2026-08-06T14:30:00.000Z"
  }
  ```

#### 2. Endpoint: `GET /api/admin/performance/analytics`
- **Description:** Fetch executive HR performance metrics and department score distributions.
- **Response (200 OK):**
  ```json
  {
    "cycleId": "cyc_2026_q3",
    "totalStaffEvaluated": 450,
    "completionPercentage": 92.4,
    "gradeDistribution": { "A+": 45, "A": 180, "B": 160, "C": 55, "D": 10 },
    "departmentAverages": [
      { "departmentId": "dept_cs", "departmentName": "Computer Science", "averageScore": 4.35 },
      { "departmentId": "dept_math", "departmentName": "Mathematics", "averageScore": 4.10 }
    ]
  }
  ```

---

## Definition of Done (DoD)

Sprint-007 will be officially declared **100% COMPLETE & MVP READY** when all of the following conditions are met:

1. **Task Execution:**
   - All 14 tasks (ADM-001 through ADM-014) are fully implemented across backend web and Flutter mobile codebase.
   - Code strictly adheres to AIOS coding standards, Next.js 16 App Router conventions, and Flutter/Riverpod guidelines in `AGENTS.md`.

2. **Build & Type Safety:**
   - `pnpm build` completes with **0 errors**.
   - `pnpm typecheck` passes with **0 errors**.
   - `flutter analyze` inside `thaibahive_mobile_app/` passes with **0 errors and 0 strict warnings**.

3. **Test Suite Verification:**
   - Next.js backend performance review unit, validation, export, notification, and security test suites (`performance-validation.test.ts`, `frameworks-api.test.ts`, `review-workflow.test.ts`, `performance-export.test.ts`, `performance-notifications.test.ts`, `multi-tenant-staging-security.test.ts`, `multi-tenant-staging-performance.test.ts`) pass with **100% success rate** (target: > 70 test suites, > 400 total passing tests).
   - Flutter unit and widget tests achieve > 80% coverage across new performance screens.

4. **Security & Production Staging Certification:**
   - Multi-tenant institution isolation verified across all 7 platform domains with zero cross-tenant data exposure.
   - Immutable score locking verified upon review state machine transition.
   - Response times certified <500ms for 95% of queries under multi-tenant staging load.

5. **Documentation & Handoff:**
   - Execution log recorded at `.ai/execution/Sprint-007-Execution-Log.md`.
   - `.ai/FEATURES.md` updated marking Admin Performance Reviews & HR module complete (**100% overall product completion**).
   - `.ai/CHANGELOG.md` updated with v1.9.0 release notes.
   - User guide created at `docs/admin-performance-review-guide.md`.
   - Verification Engineer (Opencoder) issues passing Release Certificate.

---

### Sprint Team

**Product Engineering Manager:** Devin (AIOS)  
**Implementation Engineer:** Antigravity  
**Verification Engineer:** Opencoder  
**Architecture Lead:** AIOS Architecture Council  
**Security Auditor:** Antigravity Security  

---

*Contract Approved: 2026-07-31*  
*Classification: AIOS v3.0 Official Implementation Contract*  
*Target Release Version: v1.9.0 (100% MVP Milestone)*  
