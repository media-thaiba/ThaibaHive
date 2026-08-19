# Implementation Contract: Sprint-002 Export Engine Implementation

**Sprint ID:** EXP-ENG-002  
**Sprint Name:** Export Engine Implementation  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-30  
**Target Execution:** 2026-07-31 to 2026-08-06  
**Estimated Duration:** 5–6 days (40 hours)  
**Risk Level:** Medium  
**Classification:** AIOS v3.0 Official Implementation Contract  

---

## Executive Summary

Sprint-002 completes and elevates the stubbed export engine (`src/app/api/export/route.ts`) to deliver enterprise-grade data export capabilities across 23+ campuses. While Sprint-001 established the API client wrapper and Media Library frontend integration, Sprint-002 addresses a critical administrative capability gap by enabling CSV, Excel (`.xlsx`), and PDF (`.pdf`) exports for Attendance, Leaves, Staff Directory, Payroll, Accounts, Assets, and Expense Claims. 

This contract validates the technical soundness of the Sprint-002 recommendation, addresses edge cases (large dataset memory bounds, CSV formula injection, serverless timeouts, and domain-granular RBAC), and defines 12 implementation tasks with explicit acceptance criteria, verification methods, and testing requirements.

---

## Technical Feasibility & Assessment

### Soundness Evaluation
The Sprint-002 recommendation is **technically sound and highly feasible**. The current codebase already possesses a working backend stub handling basic CSV output for 7 domain types. However, expanding this system to support formatted Excel spreadsheets and stylized PDF documents requires clear architectural boundaries, pure JavaScript formatting libraries (to maintain Vercel Serverless & Node compatibility), and strict tenant data isolation.

### Technical Assessment & Risks Identified

1. **Format Library Selection & Runtime Compatibility**
   - *Risk:* Heavy binary native dependencies (e.g. native C++ PDF or Excel bindings) can break serverless builds or inflate bundle sizes.
   - *Mitigation:* Standardize on pure JavaScript libraries (`exceljs` for XLSX generation with stream support, and `pdfkit` / `@react-pdf/renderer` or `jspdf` for PDF generation).

2. **Memory Bounds & Serverless Timeout Limits**
   - *Risk:* Generating complex Excel or multi-page PDF documents for large datasets (>5,000 rows) can exceed serverless memory limits (1024MB) or execution timeout bounds (10–30s).
   - *Mitigation:* Enforce `MAX_EXPORT_ROWS = 5000` per synchronous export, stream HTTP response headers (`Content-Type`, `Content-Disposition`), optimize ORM queries via selective field projections, and use chunked execution loops.

3. **CSV & Excel Formula Injection Vulnerability**
   - *Risk:* User-controlled text fields (e.g. employee names, transaction descriptions, notes) starting with `=`, `+`, `-`, `@`, `\t`, or `\r` can execute arbitrary commands or external data links when opened in Excel/LibreOffice.
   - *Mitigation:* Implement rigorous formula sanitization by prepending single quotes (`'`) to all untrusted string fields before formatting into CSV or Excel cells.

4. **Security & Granular RBAC Permissions**
   - *Risk:* Guarding all export endpoints with a single global permission (`finance:export`) creates over-privileged access risks (e.g. a staff manager with `attendance:read` denied attendance export, or an HR manager gaining financial transaction access).
   - *Mitigation:* Enforce domain-granular RBAC permissions (`attendance:read` / `attendance:export`, `staff:read` / `staff:export`, `leaves:read` / `leaves:export`, `payroll:read` / `payroll:export`, `finance:read` / `finance:export`, `assets:read` / `assets:export`, `expenses:read` / `expenses:export`) with fallback to legacy `finance:export`.

5. **Multi-Tenant Institution Data Leakage**
   - *Risk:* Incorrect SQL `LEFT JOIN` filters could leak cross-campus records when an administrator belongs to multiple campuses or requests global exports.
   - *Mitigation:* Enforce mandatory institution isolation checks (`staffInstitutions`) on all database query branches, returning `403 Forbidden` for unauthorized institution access.

---

## Sprint Metadata & Goal

### Sprint Goal
Complete and elevate the stubbed export engine to support high-performance, secure CSV, Excel (`.xlsx`), and PDF (`.pdf`) exports for Attendance, Leaves, Staff Directory, Payroll, Accounts, Assets, and Expense Claims with interactive UI controls, domain-granular RBAC, and strict multi-tenant institution isolation.

### Business Value
- **Campus Operations:** Eliminates manual data copying across 23+ campuses, saving an estimated 2–4 hours per week per campus.
- **Compliance & Auditing:** Provides audit-ready PDF and Excel reports for regulatory inspections and external financial audits.
- **Data Portability:** Enables seamless integration with external payroll, accounting, and HR management software.
- **User Satisfaction:** Delivers top-requested administrative feature without introducing architectural complexity.

---

## Scope & Out of Scope

### In Scope
1. **Multi-Format Export Engine:** Standardized CSV, Excel (`.xlsx`), and PDF (`.pdf`) document generators.
2. **Domain Export Types:**
   - Attendance Logs (date range, institution, check-in/out, worked hours, late/early flags)
   - Leave Requests (status, leave type, start/end dates, days count, reviewer notes)
   - Staff Directory (employee ID, department, designation, role, contact info)
   - Payroll Summary (working days, present/absent counts, late arrivals, net payable days)
   - Financial Accounts (transaction date, type, category, amount, recorded by, institution)
   - Asset Inventory (tag, serial number, model, purchase date/cost, assigned staff, status)
   - Expense Claims (claim ID, category, description, amount, status, submission date)
3. **Security & Access Control:** Formula injection sanitization, domain-granular RBAC permission checks, and multi-tenant institution isolation.
4. **Interactive Frontend Components:** Reusable `<ExportDialog>` primitive with format selectors (CSV, Excel, PDF), date range pickers, institution scope selector, progress state, and toast notifications.
5. **Shell UI Integration:** Upgrade export triggers on Attendance, Staff, Accounts, Expenses, Assets, and Reports pages.
6. **Automated Testing & Verification:** Unit tests for format engines, API route integration tests, Playwright E2E tests, and security isolation tests.
7. **Documentation:** System architecture guide (`docs/export-engine-guide.md`), feature status updates, and user documentation.

### Explicitly Out of Scope
- Background worker queues (Redis/BullMQ) for asynchronous offline exports exceeding 50,000 rows (deferred to multi-campus scale sprint).
- Custom visual PDF template drag-and-drop designer (standard branded templates used).
- Scheduled automated email export delivery (deferred to notification engine sprint).
- Export of binary media file attachments (images, PDFs) attached to expense claims (handled via MediaHive batch download).

---

## Prerequisites & Dependencies

### Prerequisites
- ✅ Sprint-001 complete with unified API client wrapper (`src/lib/api/client.ts`) operational.
- ✅ Dual-dialect database schema (SQLite dev / PostgreSQL prod) intact.
- ✅ RBAC permission engine (`packages/auth`) operational.

### Dependencies
- **Format Libraries:**
  - `exceljs` (^4.4.0) — High-performance XLSX file creation with cell styling and sheet management.
  - `pdfkit` (^0.15.0) & `@types/pdfkit` — Pure JavaScript PDF document generation with streaming buffer support.
- **UI Components:** Radix UI Dialog, Select, DatePicker, Button, and `sonner` toast system.

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Serverless Memory Spike during PDF/Excel Generation** | High | Medium | Enforce `MAX_EXPORT_ROWS = 5000` per request; stream buffers directly to HTTP response headers. |
| **CSV / Excel Formula Injection Attacks** | High | Low | Sanitize all string fields by prepending `'` when string starts with `=,+,-,@,\t,\r`. |
| **Cross-Tenant Data Exposure** | Critical | Low | Verify `staffInstitutions` tenancy checks on every query branch; audit with dedicated security test suite. |
| **Browser File Download Failure on Large Blobs** | Medium | Low | Use `URL.createObjectURL` with proper MIME types (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/pdf`, `text/csv`) and automated cleanup (`revokeObjectURL`). |

---

## Rollback Strategy

If critical issues or regressions emerge post-deployment:
1. **API Rollback:** Revert `src/app/api/export/route.ts` to the previous CSV-only implementation.
2. **UI Feature Flag / Fallback:** Update `<ExportDialog>` to default to standard CSV download mode if binary format rendering fails.
3. **Dependency Isolation:** Format libraries (`exceljs`, `pdfkit`) operate strictly as helper utilities inside export services; zero side-effects on core platform data or database schema.

---

## Implementation Tasks

The sprint is broken down into 12 execution tasks:

```
EXP-001 ──► EXP-002 ──► EXP-005 ──► EXP-007 ──► EXP-008 ──► EXP-010 ──► EXP-012
             │           │           │
             ├──► EXP-003┤           └──► EXP-009
             │           │
             └──► EXP-004┴──► EXP-006 ──► EXP-011
```

---

### Task EXP-001: Format Library Integration & Core Export Abstraction

- **Task ID:** EXP-001
- **Objective:** Install required export libraries (`exceljs`, `pdfkit`) and build core formatting interface contracts.
- **Description:** Add `exceljs` and `pdfkit` dependencies to `package.json`. Create `src/lib/export/types.ts` defining standard export parameters, domain row contracts, header schemas, and formatter interfaces (`ExportFormatter`).
- **Files Expected to Change:**
  - `package.json` [MODIFY]
  - `src/lib/export/types.ts` [NEW]
- **Dependencies:** None
- **Acceptance Criteria:**
  1. `exceljs` and `pdfkit` installed and verified cleanly in `package.json`.
  2. `ExportFormatter` interface defined with methods for CSV, XLSX, and PDF generation.
  3. `tsc --noEmit` passes with zero errors.
- **Verification Method:** Run `pnpm typecheck`.
- **Estimated Complexity:** Low (0.5 days)

---

### Task EXP-002: Enhanced CSV Generator & Formula Injection Sanitization

- **Task ID:** EXP-002
- **Objective:** Extract and upgrade CSV generation logic into a standalone, secure utility.
- **Description:** Implement `src/lib/export/csv-formatter.ts`. Ensure UTF-8 BOM (`\uFEFF`) inclusion for Excel UTF-8 compatibility, RFC 4180 quote escaping, and formula injection sanitization (`'` prefix on formula triggers).
- **Files Expected to Change:**
  - `src/lib/export/csv-formatter.ts` [NEW]
  - `src/lib/export/__tests__/csv-formatter.test.ts` [NEW]
- **Dependencies:** EXP-001
- **Acceptance Criteria:**
  1. Correctly formats array of records into standard CSV with headers.
  2. String values starting with `=,+,-,@,\t,\r` are sanitized with leading single quote.
  3. Includes UTF-8 BOM bytes at start of output.
  4. Unit test suite passes 100%.
- **Verification Method:** `npm test src/lib/export/__tests__/csv-formatter.test.ts`
- **Estimated Complexity:** Low (0.5 days)

---

### Task EXP-003: Excel (.xlsx) Export Engine with Styling & Multi-sheet Support

- **Task ID:** EXP-003
- **Objective:** Build robust Excel spreadsheet generator using `exceljs`.
- **Description:** Implement `src/lib/export/excel-formatter.ts`. Generate styled `.xlsx` workbooks with professional headers, auto-fitted column widths, formatted currency/date cells, zebra striping, and formula injection protection.
- **Files Expected to Change:**
  - `src/lib/export/excel-formatter.ts` [NEW]
  - `src/lib/export/__tests__/excel-formatter.test.ts` [NEW]
- **Dependencies:** EXP-001
- **Acceptance Criteria:**
  1. Produces valid `.xlsx` binary buffers.
  2. Header rows styled with solid fill background (`#1E293B`) and white bold text.
  3. Numeric/currency values formatted correctly (e.g. `$#,##0.00`).
  4. Columns auto-sized based on maximum text length.
  5. Unit tests verify binary buffer generation and sheet structure.
- **Verification Method:** `npm test src/lib/export/__tests__/excel-formatter.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task EXP-004: PDF Document Generator with Branded Layout & Header/Footer

- **Task ID:** EXP-004
- **Objective:** Implement PDF document rendering engine with professional institutional template layout.
- **Description:** Implement `src/lib/export/pdf-formatter.ts` using `pdfkit`. Generate branded PDF documents containing institution header, generation timestamp, filter criteria summary, structured grid/tables, page numbering (e.g. "Page X of Y"), and footer disclaimers.
- **Files Expected to Change:**
  - `src/lib/export/pdf-formatter.ts` [NEW]
  - `src/lib/export/__tests__/pdf-formatter.test.ts` [NEW]
- **Dependencies:** EXP-001
- **Acceptance Criteria:**
  1. Produces valid `%PDF-1.4` binary stream/buffer.
  2. Includes institutional title header, filter summary metadata, and tabular layout.
  3. Handles multi-page overflow cleanly with repeating header rows.
  4. Unit tests verify non-empty PDF buffer generation.
- **Verification Method:** `npm test src/lib/export/__tests__/pdf-formatter.test.ts`
- **Estimated Complexity:** Medium-High (1.5 days)

---

### Task EXP-005: API Route Handler Enhancement & Format Query Parameter Support

- **Task ID:** EXP-005
- **Objective:** Refactor `src/app/api/export/route.ts` to integrate format selection and domain generators.
- **Description:** Update `src/app/api/export/route.ts` to accept `format=csv|xlsx|pdf` query parameter. Wire up format generators (`csv-formatter`, `excel-formatter`, `pdf-formatter`). Set correct `Content-Type` headers (`text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/pdf`) and `Content-Disposition` filenames.
- **Files Expected to Change:**
  - `src/app/api/export/route.ts` [MODIFY]
- **Dependencies:** EXP-002, EXP-003, EXP-004
- **Acceptance Criteria:**
  1. Endpoint accepts `format` query param (defaulting to `csv` for backward compatibility).
  2. Returns appropriate MIME type headers and binary buffer for `.xlsx` and `.pdf`.
  3. Maintains `MAX_EXPORT_ROWS = 5000` limit and error responses.
  4. Returns `400 Bad Request` for invalid `format` or `type`.
- **Verification Method:** Run API integration test suite via `npm test`.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXP-006: Domain-Granular RBAC Permission Guarding & Multi-Tenant Audit

- **Task ID:** EXP-006
- **Objective:** Enhance security permissions and multi-tenant isolation in export route.
- **Description:** Update `src/app/api/export/route.ts` to enforce domain-granular permission checks (e.g. `attendance:read`, `staff:read`, `payroll:read`, `finance:read`, `assets:read`, `expenses:read`) while maintaining `finance:export` override. Audit all SQL queries to guarantee strict institution tenant scoping.
- **Files Expected to Change:**
  - `src/app/api/export/route.ts` [MODIFY]
  - `packages/auth/src/permissions.ts` [MODIFY]
- **Dependencies:** EXP-005
- **Acceptance Criteria:**
  1. Users with domain permissions can export corresponding data types.
  2. Unauthorized users receive `403 Forbidden` with detailed error message.
  3. `super_admin` and `admin` roles retain full export rights.
  4. Institution isolation checks prevent cross-tenant record leakage.
- **Verification Method:** Execute security audit test suite.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task EXP-007: Reusable UI Export Modal & Dialog Component

- **Task ID:** EXP-007
- **Objective:** Build interactive `<ExportDialog>` primitive with format selection and date range controls.
- **Description:** Create `src/components/export-dialog.tsx` leveraging Radix UI Dialog primitives. Provide format radios (CSV, Excel, PDF), date range pickers (`dateFrom`, `dateTo`), institution filter selector (for admins), download progress spinner, and error toast handling via `sonner`. Update `src/components/export-button.tsx` to launch `<ExportDialog>`.
- **Files Expected to Change:**
  - `src/components/export-dialog.tsx` [NEW]
  - `src/components/export-button.tsx` [MODIFY]
- **Dependencies:** EXP-005
- **Acceptance Criteria:**
  1. Modal presents intuitive format selection (CSV, Excel, PDF).
  2. Includes optional date range filters and institution selector.
  3. Displays loading state during file generation and download.
  4. Displays user-friendly toast notifications on error or success.
- **Verification Method:** Manual component testing and unit test rendering.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXP-008: Integration of Export UI into Core Shell Pages

- **Task ID:** EXP-008
- **Objective:** Update core application pages to use the new `<ExportDialog>` feature.
- **Description:** Integrate `<ExportButton>` / `<ExportDialog>` into Attendance (`src/app/(shell)/attendance/page.tsx`), Staff (`src/app/(shell)/staff/page.tsx`), Accounts (`src/app/(shell)/accounts/page.tsx`), Expenses (`src/app/(shell)/expenses/page.tsx`), Assets (`src/app/(shell)/assets/page.tsx`), and Reports (`src/app/(shell)/reports/page.tsx`).
- **Files Expected to Change:**
  - `src/app/(shell)/attendance/page.tsx` [MODIFY]
  - `src/app/(shell)/staff/page.tsx` [MODIFY]
  - `src/app/(shell)/accounts/page.tsx` [MODIFY]
  - `src/app/(shell)/expenses/page.tsx` [MODIFY]
  - `src/app/(shell)/assets/page.tsx` [MODIFY]
  - `src/app/(shell)/reports/page.tsx` [MODIFY]
- **Dependencies:** EXP-007
- **Acceptance Criteria:**
  1. All 6 target shell pages feature visible, responsive Export action buttons.
  2. Triggering export passes current page context and filters into `<ExportDialog>`.
  3. Zero broken UI layouts or hydration warnings.
- **Verification Method:** Run `pnpm build` and verify shell page compilation.
- **Estimated Complexity:** Medium (1 day)

---

### Task EXP-009: Unit Test Suite for Export Formatters & Formula Sanitization

- **Task ID:** EXP-009
- **Objective:** Comprehensive unit test coverage for export utilities and API route.
- **Description:** Create `src/lib/export/__tests__/export-engine.test.ts` and `src/app/api/export/__tests__/route.test.ts`. Test CSV, XLSX, and PDF generation with mock dataset, verify edge cases (null fields, formula strings, empty datasets, large datasets), and API response headers.
- **Files Expected to Change:**
  - `src/lib/export/__tests__/export-engine.test.ts` [NEW]
  - `src/app/api/export/__tests__/route.test.ts` [NEW]
- **Dependencies:** EXP-005, EXP-006
- **Acceptance Criteria:**
  1. Tests cover CSV, XLSX, and PDF generation functions.
  2. Formula injection sanitization explicitly tested with `=CMD()`, `+SUM()`, `-1+1`, `@SUM()`.
  3. API route returns 200 OK with correct MIME types for all 3 formats.
  4. 100% test pass rate.
- **Verification Method:** Run `npm test`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task EXP-010: E2E Automated Verification Suite

- **Task ID:** EXP-010
- **Objective:** Implement Playwright end-to-end test suite for Export Engine UI workflows.
- **Description:** Create `e2e/export-engine.spec.ts`. Automate opening Export dialog on Shell pages, selecting CSV/Excel/PDF formats, setting date ranges, triggering download, and verifying HTTP response headers and file content.
- **Files Expected to Change:**
  - `e2e/export-engine.spec.ts` [NEW]
- **Dependencies:** EXP-008
- **Acceptance Criteria:**
  1. E2E tests verify Export Dialog launch from Attendance and Accounts pages.
  2. E2E tests trigger CSV, XLSX, and PDF downloads and intercept response headers.
  3. E2E test suite executes cleanly without flaky failures.
- **Verification Method:** `npx playwright test e2e/export-engine.spec.ts`
- **Estimated Complexity:** Medium (0.5 days)

---

### Task EXP-011: Security & RBAC Isolation Verification

- **Task ID:** EXP-011
- **Objective:** Audit RBAC authorization enforcement and tenant institution isolation.
- **Description:** Create `src/lib/__tests__/export-security.test.ts`. Test unauthenticated access attempts (401), unauthorized role access attempts (403), cross-tenant institution data access attempts (403), and formula injection sanitization.
- **Files Expected to Change:**
  - `src/lib/__tests__/export-security.test.ts` [NEW]
- **Dependencies:** EXP-006
- **Acceptance Criteria:**
  1. Unauthenticated requests return 401 Unauthorized.
  2. Role lacking export permission returns 403 Forbidden.
  3. Attempting to export another institution's data returns 403 Forbidden.
  4. Zero security test failures.
- **Verification Method:** `npm test src/lib/__tests__/export-security.test.ts`
- **Estimated Complexity:** Medium (0.5 days)

---

### Task EXP-012: Documentation & API Guide Updates

- **Task ID:** EXP-012
- **Objective:** Document export engine architecture, API schemas, and component usage.
- **Description:** Create `docs/export-engine-guide.md` covering API endpoints, query parameters, format options, RBAC permissions, and UI component usage. Update `.ai/FEATURES.md` and `.ai/CHANGELOG.md`.
- **Files Expected to Change:**
  - `docs/export-engine-guide.md` [NEW]
  - `.ai/FEATURES.md` [MODIFY]
  - `.ai/CHANGELOG.md` [MODIFY]
- **Dependencies:** EXP-010, EXP-011
- **Acceptance Criteria:**
  1. Comprehensive export engine guide created in `docs/`.
  2. `.ai/FEATURES.md` updated to mark Export Engine as 100% Complete.
  3. `.ai/CHANGELOG.md` updated with v1.4.0 release notes.
- **Verification Method:** Manual document inspection.
- **Estimated Complexity:** Low (0.5 days)

---

## Detailed Specifications

### API Changes

#### Endpoint: `GET /api/export`

- **Query Parameters:**
  - `type` (required): `attendance | leaves | staff | payroll | accounts | assets | expenses`
  - `format` (optional): `csv | xlsx | pdf` (default: `csv`)
  - `dateFrom` (optional): `YYYY-MM-DD`
  - `dateTo` (optional): `YYYY-MM-DD`
  - `institutionId` (optional): UUID string (scoped to caller's allowed institutions unless super_admin)

- **Response Headers:**
  - `CSV`: `Content-Type: text/csv; charset=utf-8`
  - `Excel`: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `PDF`: `Content-Type: application/pdf`
  - `Content-Disposition`: `attachment; filename="[type]-export-[YYYY-MM-DD].[ext]"`

- **Status Codes:**
  - `200 OK`: Successful file binary stream.
  - `400 Bad Request`: Missing or invalid `type`/`format` parameter.
  - `401 Unauthorized`: Missing or invalid JWT session.
  - `403 Forbidden`: Insufficient RBAC permission or unauthorized institution access.
  - `500 Internal Server Error`: Export formatting error or database failure.

---

### Database Changes

- **Schema Changes:** **NONE.**
- *Rationale:* All required domain entities (`attendanceLogs`, `leaveRequests`, `staff`, `financialTransactions`, `assets`, `expenseClaims`, `institutions`, `departments`) already exist in `packages/db/schema.ts` and `src/db/schema.ts`. Dual-dialect SQLite/PostgreSQL Drizzle schema is fully compatible.

---

### UI Changes

1. **`<ExportDialog>` Component (`src/components/export-dialog.tsx`):**
   - Radix UI Modal with title "Export Data".
   - Format Selector: Radio group / segmented control for CSV, Excel (.xlsx), and PDF (.pdf).
   - Date Filters: `Start Date` and `End Date` inputs.
   - Institution Selector: Dropdown (visible only to system admins).
   - Download Button: Triggers download with loading state and progress spinner.
   - Error Toast: Triggers `toast.error(message)` on API failure.

2. **Shell Page Triggers:**
   - Attendance page (`src/app/(shell)/attendance/page.tsx`): Header action button launching `<ExportDialog type="attendance" />`.
   - Staff page (`src/app/(shell)/staff/page.tsx`): Header action button launching `<ExportDialog type="staff" />`.
   - Accounts page (`src/app/(shell)/accounts/page.tsx`): Header action button launching `<ExportDialog type="accounts" />`.
   - Expenses page (`src/app/(shell)/expenses/page.tsx`): Header action button launching `<ExportDialog type="expenses" />`.
   - Assets page (`src/app/(shell)/assets/page.tsx`): Header action button launching `<ExportDialog type="assets" />`.
   - Reports page (`src/app/(shell)/reports/page.tsx`): Card action buttons launching `<ExportDialog>` for target report types.

---

## Testing & Quality Assurance Plan

### Automated Test Requirements
1. **Unit Tests:**
   - Format generators (`csv-formatter.test.ts`, `excel-formatter.test.ts`, `pdf-formatter.test.ts`).
   - Formula injection sanitization checks (`=`, `+`, `-`, `@`).
   - Standard execution via `npm test`.

2. **Integration & API Tests:**
   - API route tests (`route.test.ts`) covering all 7 types across CSV, XLSX, and PDF formats.
   - MIME header validation and status code verification.

3. **Security Audit Tests:**
   - Tenant isolation tests (`export-security.test.ts`) verifying cross-institution access rejection.
   - Granular RBAC permission check verification.

4. **E2E Tests:**
   - Playwright end-to-end test (`e2e/export-engine.spec.ts`) testing export modal interaction and file download.

---

## Definition of Done (DoD)

Sprint-002 will be deemed **100% COMPLETE** when all of the following criteria are satisfied:

1. **Implementation:**
   - All 12 tasks (EXP-001 through EXP-012) implemented according to specification.
   - Format support (CSV, Excel, PDF) fully operational across all 7 domain types.
   - Formula injection sanitization enforced on all export types.
   - Domain-granular RBAC and institution isolation verified.

2. **Build & Quality:**
   - `pnpm build` completes with **0 errors**.
   - `pnpm typecheck` (`tsc --noEmit`) passes with **0 errors**.
   - `pnpm lint` passes with **0 new warnings**.
   - Unit and integration tests pass with **100% success rate**.

3. **Verification:**
   - Security verification passed (zero tenant data leakage).
   - E2E Playwright test suite passes.
   - Release Certificate generated by Verification Engineer.

4. **Documentation:**
   - `.ai/execution/Sprint-002-Execution-Log.md` recorded.
   - `.ai/FEATURES.md` and `.ai/CHANGELOG.md` updated.
   - `docs/export-engine-guide.md` published.
