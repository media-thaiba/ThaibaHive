# Implementation Contract: Sprint-004 Examination Management System

**Sprint ID:** EXAM-ENG-004  
**Sprint Name:** Examination Management System  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-31  
**Target Execution:** 2026-08-03 to 2026-08-11  
**Estimated Duration:** 6–8 days (42–56 hours)  
**Risk Level:** Medium  
**Classification:** AIOS v3.0 Official Implementation Contract  

---

## Executive Summary

Sprint-004 transitions ThaibaHive from Phase 1 (Core Platform & Wave 1 Finance) to Phase 2 (Wave 2 Academics & Examinations) of the product roadmap by delivering a comprehensive, enterprise-grade **Examination Management System**. This sprint enables complete examination lifecycle management—from exam setup and subject mapping, fee-clearance locked hall ticket generation, double-blind mark entry, automated grade scale calculation, tabulation register analytics, to encrypted PDF report card publishing for over 23+ campuses.

**Key Business Impact:**
- **70% reduction** in manual exam administration, hall ticket distribution, and mark entry overhead.
- **100% fee-clearance enforcement**, blocking hall ticket issuance for students with pending fee dues and accelerating fee collection.
- **Zero grade manipulation** via double-blind mark entry options and complete audit trail tracking.
- **8-12 hours saved** per examination cycle per campus through automated grade computation and batch PDF report card generation.

**Strategic Alignment:**
- Builds on **Sprint-001's API Client Pattern** (`src/lib/api/client.ts`) for unified client-side state management and error handling.
- Leverages **Sprint-002's Export Engine** (`src/lib/export/`) to enable multi-format exports (CSV, XLSX, PDF) of tabulation registers and mark sheets.
- Integrates directly with **Sprint-003's Finance Module** (`src/app/api/finance/` and `src/db/schema.ts`) to validate student fee clearance status before issuing digital hall tickets.
- Extends the dual-dialect **Drizzle ORM** schema (`packages/db/schema.ts` for SQLite dev, `packages/db/schema.pg.ts` for PostgreSQL prod).
- Enforces multi-tenant institution isolation and 6-tier RBAC (`super_admin`, `admin`, `principal`, `hod`, `staff`) via `@thaiba/auth`.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation
The Sprint-004 specification is **technically sound, highly feasible, and architecturally aligned**. ThaibaHive already possesses:
- Working RBAC auth guards `requireAuth(handler, "permission:string")` from `src/lib/api/auth-guard.ts`.
- Integrated Finance Module schema with student ledger and fee payment records.
- Established multi-format Export Engine (`src/lib/export/export-service.ts`) and PDF generation engine (`pdfkit`).
- Standardized UI primitive library (`src/components/ui/`) including `<Dialog>`, `<Badge>`, `<Skeleton>`, `<Table>`, and `<Alert>`.
- Proven dual-dialect Drizzle ORM patterns and database migration workflows.

### Technical Assessment & Risks Identified

1. **Hall Ticket Fee Clearance Lock Integration**
   - *Challenge:* Block hall ticket issuance dynamically if a student has unpaid fee balances, while allowing administrative overrides for special cases.
   - *Mitigation:* Connect directly to the Finance Module fee status endpoints (`src/app/api/finance/fee-status`). Implement atomic clearance checks with audit logging for administrative override actions.

2. **Flexible Grade Scale & Automated Mark Calculation Engine**
   - *Challenge:* Different institutions and courses require distinct grading scales (e.g., 10-point GPA, letter grades A-F, percentage ranges, pass/fail thresholds).
   - *Mitigation:* Create a deterministic grade calculation service (`src/lib/examinations/grade-calculator.ts`) supporting configurable scale matrices and weighted grade point averages.

3. **Concurrent Double-Blind Mark Entry & Conflict Resolution**
   - *Challenge:* Multiple evaluators entering marks for large student cohorts simultaneously without data overwrite or grade leakage.
   - *Mitigation:* Implement optimistic concurrency control via version tokens/timestamps in Drizzle ORM queries (`eq(markEntries.updatedAt, expectedTime)`). Support double-blind evaluation modes hiding student identities until final moderation.

4. **Report Card PDF Generation & Encrypted Delivery**
   - *Challenge:* Generating hundreds of multi-page student report cards concurrently without causing server memory spikes or HTTP timeouts.
   - *Mitigation:* Stream PDF buffer generation using `pdfkit` templates, chunking batch processing into streams (max 50 student PDFs per chunk), and delivering encrypted PDFs to the parent portal.

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule**, this contract was submitted to **Qwen**, **OpenCode**, and **Claude Code** for peer review and optimization. The following enhancements were incorporated into the contract:

1. **Concurrency Control & Overwrite Handling (Qwen):** Enhanced `EXAM-005` batch mark entry specification with explicit optimistic concurrency resolution (`updatedAt` timestamp verification) and explicit duplicate student ID validation rules.
2. **Real-time Fee Sync & Audit Override (Qwen):** Added real-time fee ledger re-validation before hall ticket lock evaluation, with an audit log retention policy of minimum 7 years for compliance.
3. **Export Engine Data Sanitization (OpenCode):** Verified DDE formula injection sanitization (`'`) across all exported CSV, Excel, and PDF tabulation files in `EXAM-012`.
4. **PDF Generation Performance Benchmarks (Claude Code):** Added stream-based PDF buffer chunking (50 student report cards per batch) in `EXAM-011` to prevent memory bottlenecks.

---

## Scope & Out of Scope

### In Scope

1. **Database Schema & Dual-Dialect Models:**
   - Drizzle schemas for `exams`, `exam_schedules`, `hall_tickets`, `mark_entries`, `tabulation_registers`, `grade_scales`, and `exam_audit_logs`.
   - SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) migrations.

2. **Examination Setup & Schedule Engine:**
   - Exam configuration endpoints (`/api/examinations/exams`, `/api/examinations/schedules`).
   - Subject mapping, maximum/pass mark definitions, exam room/time slot allocations.

3. **Fee-Clearance Integrated Hall Ticket System:**
   - Hall ticket generation endpoints (`/api/examinations/hall-tickets`).
   - Finance fee clearance validation lock (blocks issue if balance > 0).
   - Instant QR code generation with secure cryptographic payload and verification API (`/api/examinations/hall-tickets/verify`).

4. **Secure & Double-Blind Mark Entry Portal:**
   - Mark entry endpoints (`/api/examinations/marks`, `/api/examinations/marks/batch`).
   - Double-blind evaluation mode (masks student names/IDs with dummy evaluator tokens).
   - Draft saving, auto-calculation of totals, percentages, and letter grades.

5. **Tabulation Register & Academic Analytics:**
   - Tabulation API (`/api/examinations/tabulation`).
   - Consolidated class mark view, subject pass %, topper analytics, and grade distribution charts.
   - Integration with Sprint-002 Export Engine for CSV, XLSX, and PDF exports.

6. **Encrypted Report Card PDF Generator:**
   - Template-based PDF report card generator (`src/lib/examinations/report-card-generator.ts`).
   - PDF encryption with student birthdate/password access.
   - Report card publishing API and parent portal delivery endpoint.

7. **Interactive Frontend Shell & Components:**
   - **Examination Dashboard** (`src/app/(shell)/examinations/page.tsx`) with status tabs (Draft, Scheduled, Ongoing, Evaluation, Published).
   - Interactive components: `<ExamSetupWizard>`, `<HallTicketDialog>`, `<MarkEntryPortal>`, `<TabulationRegister>`, `<ReportCardViewer>`.

8. **Security, RBAC & Audit Logging:**
   - Enforce permissions: `exam:create`, `exam:enter_marks`, `exam:approve_marks`, `exam:publish_results`, `exam:override_fee_lock`.
   - Cross-campus institution data isolation checks on all DB queries.
   - Append-only audit history for all mark modifications and grade overrides.

9. **Automated Testing & Documentation:**
   - Unit tests for grade calculator, fee clearance validator, and hall ticket verification.
   - Security test suite verifying RBAC and tenant isolation.
   - E2E Playwright test suite for complete exam lifecycle.
   - User guide (`docs/examination-system-guide.md`) and AIOS registry updates (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`).

### Explicitly Out of Scope

- Remote online web-proctored examination monitoring (camera/screen lock).
- Hardware optical mark recognition (OMR) sheet scanning integration.
- University external board API integration (deferred to Phase 3).
- Drag-and-drop visual report card designer tool (standard customizable institutional templates provided).

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **False Hall Ticket Block Due to Fee Status Desync** | High | Medium | Implement real-time fee re-validation endpoint with administrative manual override log (`exam:override_fee_lock`). |
| **Grade Calculation Logic Discrepancies** | High | Low | Build comprehensive unit test suite testing GPA, letter grades, percentage bounds, and edge-case rounding. |
| **Concurrent Mark Entry Data Overwrite** | Medium | Medium | Use optimistic locking (`updatedAt` check) during batch mark updates to prevent overwrite conflicts. |
| **Report Card PDF Generation Memory Spike** | Medium | Medium | Use stream-based `pdfkit` buffer generation with batch size limits (max 50 student PDFs per chunk). |
| **Cross-Tenant Academic Data Leakage** | Critical | Low | Enforce explicit `institutionId` filter on all examination Drizzle queries; verify via `exam-security.test.ts`. |

---

## Rollback Strategy

In the event of critical defects or operational issues post-deployment:

1. **Feature Flag Deactivation:** Set configuration environment variable `NEXT_PUBLIC_EXAMINATIONS_ENABLED=false`. When disabled, examination UI routes display a maintenance notification and API endpoints return a `503 Service Unavailable` status with rollback fallback headers.
2. **Database Migration Isolation:** Schema additions (`exams`, `hall_tickets`, `mark_entries`, `tabulation_registers`) are non-destructive and additive. Rolling back code will not alter or remove pre-existing tables.
3. **Audit Trail Retention:** All hall ticket issuances, mark entries, and audit logs recorded prior to rollback will remain safely stored for auditing and compliance recovery.
4. **Fallback Interface:** Provide clear fallback banners instructing academic officers to fallback to previous legacy manual workflows while fixes are deployed.

---

## Implementation Tasks

The sprint is structured into 14 sequential implementation tasks:

```
EXAM-001 ──► EXAM-002 ──► EXAM-003 ──► EXAM-004 ──► EXAM-005
             │           │           │           │
             ├──► EXAM-006 ──► EXAM-007 ──► EXAM-008
             │           │           │
             └──► EXAM-009 ──► EXAM-010 ──► EXAM-011 ──► EXAM-012 ──► EXAM-013 ──► EXAM-014
```

---

### Task EXAM-001: Examination Domain Schema & Dual-Dialect Drizzle Models

- **Task ID:** EXAM-001
- **Description:** Design and declare Drizzle ORM schemas for examination management entities across SQLite (dev) and PostgreSQL (prod), creating tables for exams, exam schedules, hall tickets, mark entries, tabulation registers, grade scales, and audit logs. Update Zod validation schemas.
- **Files:**
  - `[MODIFY] packages/db/schema.ts`
  - `[MODIFY] packages/db/schema.pg.ts`
  - `[MODIFY] src/lib/validation/schemas.ts`
  - `[NEW] src/db/seeds/examination-seed.ts`
- **Dependencies:** None
- **Acceptance Criteria:**
  1. SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) schemas defined for `exams`, `examSchedules`, `hallTickets`, `markEntries`, `tabulationRegisters`, `gradeScales`, and `examAuditLogs`.
  2. Foreign keys and indexes correctly map to `institutions`, `students`, `courses`, and `staff`.
  3. Zod validation schemas added in `src/lib/validation/schemas.ts` for exam creation, mark entry, and hall ticket issuance payloads.
  4. Seed file creates default examination setup, grade scale rules, and test student records cleanly.
- **Verification Method:** Run `pnpm db:generate` (or `tsc --noEmit`) and verify zero schema type errors.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-002: Grade Calculation & Scale Configuration Engine

- **Task ID:** EXAM-002
- **Description:** Implement a deterministic grade calculation utility supporting percentage-to-letter grade conversion, 10-point GPA calculation, credit weighting, pass/fail evaluation, and grace mark application.
- **Files:**
  - `[NEW] src/lib/examinations/grade-calculator.ts`
  - `[NEW] src/lib/examinations/__tests__/grade-calculator.test.ts`
- **Dependencies:** EXAM-001
- **Acceptance Criteria:**
  1. Computes total marks, percentage, letter grade (e.g., O, A+, A, B+, B, C, F), and grade points based on active grade scale definitions.
  2. Calculates SGPA / CGPA correctly considering course credit weights.
  3. Evaluates overall pass/fail status considering mandatory subject minimum pass requirements.
  4. Unit test suite achieves 100% pass rate covering edge cases (boundary scores, zero credit subjects, grace marks).
- **Verification Method:** Run `pnpm test src/lib/examinations/__tests__/grade-calculator.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-003: Examination Management & Schedule API Routes

- **Task ID:** EXAM-003
- **Description:** Implement RESTful API handlers for creating, updating, retrieving, and scheduling examinations, subject mappings, time slots, and venue allocations.
- **Files:**
  - `[NEW] src/app/api/examinations/exams/route.ts`
  - `[NEW] src/app/api/examinations/exams/[id]/route.ts`
  - `[NEW] src/app/api/examinations/schedules/route.ts`
  - `[NEW] src/lib/examinations/__tests__/exam-api.test.ts`
- **Dependencies:** EXAM-001
- **Acceptance Criteria:**
  1. `POST /api/examinations/exams` creates new exam session with multi-tenant `institutionId` scoping.
  2. `GET /api/examinations/exams` returns paginated list of exams filtered by academic term and status.
  3. `POST /api/examinations/schedules` adds timetable slots, enforcing no-room-overlap validation.
  4. Wraps all routes in `requireAuth` checking `exam:create` and `exam:read` permissions.
- **Verification Method:** Run `pnpm test src/lib/examinations/__tests__/exam-api.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-004: Fee-Clearance Validation & Hall Ticket Generation API

- **Task ID:** EXAM-004
- **Description:** Create the hall ticket issuance API service which connects to the Finance Module to verify fee clearance before issuing digital hall tickets with cryptographically signed QR codes.
- **Files:**
  - `[NEW] src/app/api/examinations/hall-tickets/route.ts`
  - `[NEW] src/app/api/examinations/hall-tickets/verify/route.ts`
  - `[NEW] src/lib/examinations/hall-ticket-service.ts`
  - `[NEW] src/lib/examinations/__tests__/hall-ticket.test.ts`
- **Dependencies:** EXAM-001, EXAM-003
- **Acceptance Criteria:**
  1. `POST /api/examinations/hall-tickets` checks student fee ledger status from Finance Module; blocks generation if unpaid balance exists (> $0).
  2. Generates cryptographic QR payload containing student roll number, exam ID, hall number, and signature hash.
  3. `GET /api/examinations/hall-tickets/verify` validates QR code payload for hall entrance invigilators.
  4. Supports administrative manual override with mandatory audit reason logging (`exam:override_fee_lock`).
- **Verification Method:** Run `pnpm test src/lib/examinations/__tests__/hall-ticket.test.ts`
- **Estimated Complexity:** Medium-High (1.5 days)

---

### Task EXAM-005: Double-Blind Mark Entry & Moderation API

- **Task ID:** EXAM-005
- **Description:** Build API handlers for single and batch mark entry by teachers, supporting double-blind evaluation mode, mark validation against max bounds, draft saving, and moderation submission.
- **Files:**
  - `[NEW] src/app/api/examinations/marks/route.ts`
  - `[NEW] src/app/api/examinations/marks/batch/route.ts`
  - `[NEW] src/app/api/examinations/marks/moderate/route.ts`
  - `[NEW] src/lib/examinations/__tests__/mark-entry-api.test.ts`
- **Dependencies:** EXAM-001, EXAM-002
- **Acceptance Criteria:**
  1. `POST /api/examinations/marks/batch` saves marks for student cohorts with optimistic concurrency locking.
  2. Double-blind mode masks student roll numbers with randomized evaluator code tokens (`EVAL-XXXX`).
  3. Enforces mark entry bounds (0 <= marks <= max_marks); returns HTTP 400 for out-of-bounds input.
  4. Moderation route (`/moderate`) permits HODs to approve or adjust marks with audit trail logs.
- **Verification Method:** Run `pnpm test src/lib/examinations/__tests__/mark-entry-api.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-006: Examination Shell & Dashboard UI Foundation

- **Task ID:** EXAM-006
- **Description:** Build the main Examination Dashboard page and queue management shell (`/app/(shell)/examinations/page.tsx`), featuring status metrics, tabs (Draft, Scheduled, Ongoing, Evaluation, Published), and search/filters.
- **Files:**
  - `[NEW] src/app/(shell)/examinations/page.tsx`
  - `[NEW] src/components/examinations/ExamDashboard.tsx`
  - `[NEW] src/components/examinations/ExamQueue.tsx`
  - `[NEW] src/components/examinations/ExamStatCards.tsx`
- **Dependencies:** EXAM-003
- **Acceptance Criteria:**
  1. Renders 5 status tabs with dynamic item count badges.
  2. Displays summary metric cards (Total Exams, Scheduled Cohorts, Pending Evaluations, Hall Tickets Issued, Pass Rate %).
  3. Uses UI primitives (`<Skeleton>`, `<Badge>`, `<Button>`, `<Card>`) and includes explicit `.catch()` handlers on all fetch calls.
  4. Fully responsive layout conforming to ThaibaHive design system.
- **Verification Method:** Run `pnpm build` and verify clean page route compilation.
- **Estimated Complexity:** High (1.5 days)

---

### Task EXAM-007: Interactive Examination Setup Wizard Component

- **Task ID:** EXAM-007
- **Description:** Develop a step-by-step modal wizard for creating examination sessions, mapping subjects, setting maximum/passing marks, and configuring schedule slots.
- **Files:**
  - `[NEW] src/components/examinations/ExamSetupWizard.tsx`
  - `[NEW] src/components/examinations/SubjectScheduleForm.tsx`
  - `[NEW] src/components/examinations/GradeScaleSelect.tsx`
- **Dependencies:** EXAM-006
- **Acceptance Criteria:**
  1. Step 1: Exam Session Details (Name, Type, Academic Term, Start/End Dates).
  2. Step 2: Subject & Schedule Mapping (Select courses, exam date, start time, duration, room allocation).
  3. Step 3: Grade Scale & Rules Selection (Select grading scale matrix and pass mark thresholds).
  4. Form validates all inputs using Zod client-side schemas before API submit.
- **Verification Method:** Manual component render testing and story interaction check.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-008: Digital Hall Ticket Portal & QR Verification View

- **Task ID:** EXAM-008
- **Description:** Build student and administrator hall ticket views, featuring digital hall ticket preview, QR code display, fee-clearance status indicator, print/download action, and invigilator QR scanner/verifier modal.
- **Files:**
  - `[NEW] src/components/examinations/HallTicketDialog.tsx`
  - `[NEW] src/components/examinations/HallTicketVerificationView.tsx`
  - `[NEW] src/components/examinations/FeeLockNotice.tsx`
- **Dependencies:** EXAM-004, EXAM-006
- **Acceptance Criteria:**
  1. Displays student details, exam timetable, allocated venue, hall ticket number, and embedded QR code.
  2. If student has unpaid fee dues, displays `<FeeLockNotice>` with clear payment redirect button.
  3. Invigilator verification modal scans/inputs QR payload and displays instantaneous green/red clearance check.
  4. Admin manual override button triggers approval modal capturing reason note.
- **Verification Method:** Render component in browser and execute hall ticket generation workflow.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-009: Mark Entry Portal & Double-Blind Verification UI

- **Task ID:** EXAM-009
- **Description:** Create the mark entry portal for teachers, supporting rapid grid keyboard navigation, double-blind masking toggle, instant total/grade preview, and batch submission.
- **Files:**
  - `[NEW] src/components/examinations/MarkEntryPortal.tsx`
  - `[NEW] src/components/examinations/MarkModerationModal.tsx`
  - `[NEW] src/components/examinations/MarkGridTable.tsx`
- **Dependencies:** EXAM-005, EXAM-006
- **Acceptance Criteria:**
  1. Grid table allows quick tab/enter key navigation between mark entry cells.
  2. Highlights invalid mark entries (exceeding subject max marks or negative) in red alert status.
  3. Toggle for "Double-Blind Mode" replaces student names and roll numbers with randomized evaluator code tokens.
  4. Auto-calculates total marks, percentages, and tentative letter grades in real-time as marks are entered.
- **Verification Method:** Manual test in browser for grid navigation, entry validation, and submission.
- **Estimated Complexity:** Medium-High (1.5 days)

---

### Task EXAM-010: Tabulation Register & Performance Analytics Component

- **Task ID:** EXAM-010
- **Description:** Build the consolidated Tabulation Register view, displaying class-wide mark matrices, subject performance pass %, GPA rank list, and grade distribution charts.
- **Files:**
  - `[NEW] src/components/examinations/TabulationRegister.tsx`
  - `[NEW] src/components/examinations/ClassAnalyticsPanel.tsx`
  - `[NEW] src/app/api/examinations/tabulation/route.ts`
- **Dependencies:** EXAM-002, EXAM-005, EXAM-006
- **Acceptance Criteria:**
  1. Displays matrix table with student rows, subject columns, grand total, percentage, SGPA, and result status (Pass/Fail/Compartment).
  2. Analytics panel displays pass percentage per subject, class average, topper score, and grade breakdown.
  3. Includes filter controls for class, section, batch, and result status.
  4. Handles large cohort data gracefully with pagination or virtual scrolling.
- **Verification Method:** Run `pnpm test` and verify tabulation calculation accuracy.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-011: Encrypted Report Card PDF Generator & Parent Portal Delivery

- **Task ID:** EXAM-011
- **Description:** Implement student report card PDF generation with customizable institutional layout templates, PDF encryption (password protected), and publish API for parent portal availability.
- **Files:**
  - `[NEW] src/lib/examinations/report-card-generator.ts`
  - `[NEW] src/components/examinations/ReportCardViewer.tsx`
  - `[NEW] src/app/api/examinations/report-cards/route.ts`
  - `[NEW] src/app/api/examinations/report-cards/publish/route.ts`
- **Dependencies:** EXAM-002, EXAM-010
- **Acceptance Criteria:**
  1. `report-card-generator.ts` uses `pdfkit` to generate clean, professional report card PDFs with institutional header, student info, subject marks grid, GPA, and principal sign block.
  2. Supports PDF encryption option (password = DOB `DDMMYYYY`).
  3. `POST /api/examinations/report-cards/publish` sets exam results to published and triggers parent portal notification.
  4. `<ReportCardViewer>` enables instant in-browser PDF preview and download.
- **Verification Method:** Generate sample PDF report card and inspect layout, grades, and security encryption.
- **Estimated Complexity:** High (1.5 days)

---

### Task EXAM-012: Export Engine Integration & Shell Navigation Update

- **Task ID:** EXAM-012
- **Description:** Integrate the Examination Management system with Sprint-002's Export Engine for multi-format exports (CSV, XLSX, PDF) of tabulation registers and mark sheets, and update navigation layouts.
- **Files:**
  - `[MODIFY] src/app/(shell)/layout.tsx`
  - `[NEW] src/app/(shell)/examinations/tabulation/page.tsx`
  - `[NEW] src/app/(shell)/examinations/report-cards/page.tsx`
  - `[NEW] src/components/examinations/ExamExportDialog.tsx`
- **Dependencies:** EXAM-006, EXAM-010, EXAM-011
- **Acceptance Criteria:**
  1. Adds "Examinations" item with academic icon to primary shell sidebar navigation (`src/app/(shell)/layout.tsx`).
  2. Extends `<ExportDialog>` primitive from Sprint-002 to export Tabulation Registers and Mark Sheets to CSV, Excel, and PDF.
  3. Sanitizes export data against DDE formula injection (`'`).
  4. Navigating to `/examinations/tabulation` loads tabulation view cleanly.
- **Verification Method:** Test export functionality for CSV, XLSX, and PDF on tabulation register page.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-013: RBAC Permissions, Security Audit & Fee Clearance Test Suite

- **Task ID:** EXAM-013
- **Description:** Conduct rigorous security testing verifying 6-tier RBAC permission enforcement, fee-clearance locks, multi-tenant institution data isolation, and audit trail immutability.
- **Files:**
  - `[NEW] src/lib/examinations/__tests__/exam-security.test.ts`
  - `[NEW] src/lib/examinations/__tests__/fee-clearance-audit.test.ts`
- **Dependencies:** EXAM-004, EXAM-005, EXAM-012
- **Acceptance Criteria:**
  1. Requests without authentic JWT token return `401 Unauthorized`.
  2. Staff without `exam:publish_results` permission attempting result publication receive `403 Forbidden`.
  3. Attempts to generate hall tickets for fee defaulters return `403 Forbidden` unless override permission `exam:override_fee_lock` is present.
  4. Cross-tenant queries return strictly 0 records from other institutions.
  5. Audit log records are strictly append-only; update/delete queries fail.
- **Verification Method:** Run `pnpm test src/lib/examinations/__tests__/exam-security.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task EXAM-014: Playwright E2E Test Suite, User Documentation & AIOS Registry Synchronization

- **Task ID:** EXAM-014
- **Description:** Create an E2E Playwright test suite automating the full examination lifecycle, author user documentation guide, and update AIOS project registries.
- **Files:**
  - `[NEW] e2e/examination-lifecycle.spec.ts`
  - `[NEW] docs/examination-system-guide.md`
  - `[MODIFY] .ai/FEATURES.md`
  - `[MODIFY] .ai/CHANGELOG.md`
- **Dependencies:** EXAM-006 through EXAM-013
- **Acceptance Criteria:**
  1. Playwright E2E spec automates user login -> Exam Setup -> Schedule Creation -> Hall Ticket Issuance -> Mark Entry -> Tabulation Register -> Report Card Publishing.
  2. `docs/examination-system-guide.md` created with clear user instructions for Exam Controllers, Teachers, Students, and Parents.
  3. `.ai/FEATURES.md` updated to record Examination Management System as active/complete.
  4. `.ai/CHANGELOG.md` updated with v1.6.0 release features.
- **Verification Method:** Run `npx playwright test e2e/examination-lifecycle.spec.ts` and verify 100% test pass.
- **Estimated Complexity:** Medium (1 day)

---

## Detailed Specifications

### API Changes

#### 1. Endpoint: `POST /api/examinations/exams`
- **Description:** Create a new examination session.
- **Request Body:**
  ```json
  {
    "title": "Final Term Examinations 2026",
    "academicYear": "2025-2026",
    "term": "Term 2",
    "startDate": "2026-09-10",
    "endDate": "2026-09-25",
    "gradeScaleId": "gs_10point_standard"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "examId": "exam_98765",
    "status": "draft",
    "createdAt": "2026-08-03T09:00:00.000Z"
  }
  ```

#### 2. Endpoint: `POST /api/examinations/hall-tickets`
- **Description:** Issue hall ticket for a student, checking fee clearance.
- **Request Body:**
  ```json
  {
    "examId": "exam_98765",
    "studentId": "stud_12345",
    "overrideFeeLock": false,
    "overrideReason": null
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "hallTicketId": "ht_55443",
    "ticketNumber": "HT-2026-98765-12345",
    "feeCleared": true,
    "qrPayload": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "issuedAt": "2026-08-04T11:20:00.000Z"
  }
  ```
- **Error Response (403 Forbidden - Fee Dues Pending):**
  ```json
  {
    "error": "Hall ticket generation blocked due to outstanding fee balance of $450.00. Fee clearance required.",
    "feeCleared": false,
    "pendingAmount": 450.00
  }
  ```

#### 3. Endpoint: `POST /api/examinations/marks/batch`
- **Description:** Batch entry of marks for a subject examination.
- **Request Body:**
  ```json
  {
    "examScheduleId": "sched_33221",
    "doubleBlind": false,
    "entries": [
      { "studentId": "stud_12345", "marksObtained": 88.5, "isAbsent": false, "remarks": "Good performance" },
      { "studentId": "stud_67890", "marksObtained": 92.0, "isAbsent": false, "remarks": "Excellent" }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "processedCount": 2,
    "updatedAt": "2026-08-05T14:15:00.000Z"
  }
  ```

---

## Definition of Done (DoD)

Sprint-004 will be officially declared **100% COMPLETE** when all of the following conditions are met:

1. **Task Execution:**
   - All 14 tasks (EXAM-001 through EXAM-014) are fully implemented and integrated.
   - Code adheres strictly to AIOS coding standards and ThaibaHive conventions.

2. **Build & Type Safety:**
   - `pnpm build` completes with **0 errors**.
   - `pnpm typecheck` (`tsc --noEmit`) passes with **0 errors**.
   - `pnpm lint` passes with **0 new warnings**.

3. **Test Suite Verification:**
   - All unit test suites (`grade-calculator.test.ts`, `hall-ticket.test.ts`, `mark-entry-api.test.ts`) pass with **100% success rate**.
   - Security verification suite (`exam-security.test.ts`) passes with 0 failures.
   - E2E Playwright test (`e2e/examination-lifecycle.spec.ts`) passes cleanly.

4. **Multi-Tenant, Security & Fee Clearance Verification:**
   - Multi-tenant institution data isolation verified across all examination API endpoints.
   - Fee clearance lock 100% verified (hall tickets blocked when fee balance > $0).
   - DDE formula injection sanitization verified on all text entry fields.

5. **Documentation & Handoff:**
   - Execution log recorded at `.ai/execution/Sprint-004-Execution-Log.md`.
   - `.ai/FEATURES.md` updated to mark Examination Management System complete.
   - `.ai/CHANGELOG.md` updated with release notes for v1.6.0.
   - User guide created at `docs/examination-system-guide.md`.
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
*Target Release Version: v1.6.0*
