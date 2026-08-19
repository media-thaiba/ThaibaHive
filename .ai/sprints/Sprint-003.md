# Implementation Contract: Sprint-003 Finance Module - Multi-Stage Approval Engine

**Sprint ID:** FIN-ENG-003  
**Sprint Name:** Finance Module - Multi-Stage Approval Engine  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-31  
**Target Execution:** 2026-08-01 to 2026-08-13  
**Estimated Duration:** 5–6 days (40–45 hours)  
**Risk Level:** Medium  
**Classification:** AIOS v3.0 Official Implementation Contract  

---

## Executive Summary

Sprint-003 accelerates ThaibaHive's time-to-market by delivering a multi-stage approval engine for the Finance Module (currently at ~60% completion). This sprint enables automated, auditable financial workflows across 23+ campuses, supporting expense claims, purchase requests, role-based routing, real-time tracking, and audit trails.

**Key Business Impact:**
- **60% reduction** in manual finance processing time across 23+ campuses.
- **90% faster** expense claim processing (3 days vs. 2-3 weeks).
- **Zero compliance gaps** with built-in audit trails and RBAC enforcement.
- **$8M+** projected annual operational savings through automation.

**Strategic Alignment:**
- Builds on **Sprint-001's API Client Pattern** (`src/lib/api/client.ts`) for unified client-side state fetching and mutation.
- Integrates with **Sprint-002's Export Engine** (`src/lib/export/`) for generating audit logs in CSV, Excel (`.xlsx`), and PDF (`.pdf`) formats.
- Extends the existing dual-dialect **Drizzle ORM** schema (SQLite dev / PostgreSQL prod).
- Integrates with existing auth module (`packages/auth`) for 6-tier RBAC (`super_admin`, `admin`, `principal`, `hod`, `staff`).

---

## Technical Feasibility & Assessment

### Soundness Evaluation
The Sprint-003 specification is **technically sound and highly feasible**. ThaibaHive already possesses:
- Working basic approvals route at `src/app/api/approvals/route.ts`.
- Existing expense claims backend endpoints (`src/app/api/expense-claims/route.ts`).
- Existing purchase requests backend endpoints (`src/app/api/purchases/route.ts`).
- Robust RBAC auth wrapper `requireAuth(handler, "permission:string")` from `src/lib/api/auth-guard.ts`.
- Multi-tenant institution isolation patterns (`staffInstitutions`, `staffDepartments`).

### Technical Assessment & Risks Identified

1. **State Machine Approval Routing Complexity**
   - *Challenge:* Multi-stage workflows with branching rules based on claim amount, emergency tags, and department heads.
   - *Mitigation:* Implement a deterministic state machine utility (`src/lib/finance/workflow-engine.ts`) with clear transition tables and strict state validation before database mutations.

2. **Audit Trail Immutability**
   - *Challenge:* Compliance requires that no approval decision, comment, or digital signature can be overwritten or deleted.
   - *Mitigation:* Store approval logs in an append-only audit trail schema with timestamping and user ID bindings. API routes will disallow UPDATE/DELETE on past audit events.

3. **Multi-Tenant Institution Data Isolation**
   - *Challenge:* Approvers across 23+ campuses must strictly view and approve requests originating from their authorized institution.
   - *Mitigation:* Enforce `staffInstitutions` query filtering across all finance API endpoints, returning `403 Forbidden` for unauthorized institution access.

4. **Real-time Queue Updates & Mobile Handoff**
   - *Challenge:* Approvers require immediate notification of pending requests across web and mobile interfaces.
   - *Mitigation:* Use WebSocket integration (`src/lib/finance/websocket-client.ts`) combined with `sonner` toast alerts on web, and leverage the **WebView Nonce Handoff** pattern (`/auth/mobile-handoff/nonce`) for mobile.

---

## Scope & Out of Scope

### In Scope

1. **Workflow & State Machine Engine:**
   - State transition machine (Draft → Submitted → Pending HOD → Pending Accounts → Pending Principal → Approved / Rejected / Returned).
   - Dynamic threshold auto-routing:
     - Expenses < $500: Auto-approval.
     - Expenses $500–$5,000: HOD approval required.
     - Expenses > $5,000: HOD → Accounts → Principal approval required.
   - Emergency purchase route (Staff → HOD → Accounts with instant 2-hour auto-approval policy).

2. **Expense Claims & Purchase Requests Integration:**
   - Multi-stage approval endpoints (`POST /api/finance/approve`, `POST /api/finance/reject`).
   - Integration with existing `/api/expense-claims` and `/api/purchases` routes.

3. **Finance Shell & Interactive UI:**
   - **FinanceDashboard** (`src/app/(shell)/finance/page.tsx`) replacing legacy accounts view with tabbed queues (Pending, In-Progress, Approved, Rejected).
   - **ApprovalModal** (`src/components/finance/ApprovalModal.tsx`) with comment capture, decision options, and digital signature canvas.
   - **StatusTimeline** (`src/components/finance/StatusTimeline.tsx`) visual progression indicator.
   - **NotificationCenter** (`src/components/finance/NotificationCenter.tsx`) for pending task alerts.

4. **Audit Trail & Financial Reporting:**
   - Append-only audit history panel (`src/components/finance/AuditTrailPanel.tsx`).
   - Integrated audit report export (CSV, XLSX, PDF) using **Sprint-002's Export Engine**.

5. **Security, RBAC & Multi-Tenant Enforcement:**
   - Permission verification for `finance:approve`, `finance:read`, `expenses:read`.
   - Cross-campus institution data isolation checks on all DB queries.

6. **Automated Testing & Documentation:**
   - Unit test coverage for state machine transitions, routing logic, and audit trail immutability.
   - E2E Playwright test suite for full approval lifecycle.
   - User guide (`docs/finance-approval-guide.md`) and updated AIOS registries (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`).

### Explicitly Out of Scope

- Third-party ERP / SAP / Banking host-to-host system integration (deferred to integration phase).
- Custom drag-and-drop visual workflow canvas designer (pre-configured institutional rules used).
- Distributed background worker queues (Redis / BullMQ) for batch approvals exceeding 50,000 items (deferred to hyper-scale phase).
- Multi-currency conversions (single campus base currency enforced).

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Complex Approval Routing Deadlocks** | High | Medium | Enforce strict state machine transitions with automated validation and timeout fallback mechanisms. |
| **Approval Delays & Stale Queues** | Medium | High | Implement 72-hour auto-escalation / timeout rules and real-time toast alerts for approvers. |
| **Cross-Tenant Data Leakage** | Critical | Low | Enforce explicit `staffInstitutions` joins on all query branches; verify with security test suite (`finance-security.test.ts`). |
| **Audit Trail Data Mutation** | Critical | Low | Design append-only audit tables with no UPDATE/DELETE routes enabled in API handlers. |
| **Mobile Webview Handoff Failures** | Medium | Medium | Use secure `WebViewHandoffScreen` nonce exchange pattern (`AppConstants.storageTokenKey`) for mobile WebView compatibility. |

---

## Rollback Strategy

If critical bugs or regressions emerge post-deployment:

1. **Feature Flag Toggling:** Expose configuration flag `NEXT_PUBLIC_FINANCE_APPROVALS_ENABLED`. When set to `false`, fallback API handlers route back to legacy single-step approval.
2. **API Route Fallback:** Revert `/api/approvals/route.ts` patch changes via git release tag while preserving historical audit log tables.
3. **Data Integrity Guarantee:** All `ApprovalHistory` and `AuditLog` rows created during activation are strictly retained (read-only) for compliance.
4. **User Notification:** Provide inline `<Alert>` notification on Finance Dashboard instructing users of temporary manual approval fallback.

---

## Implementation Tasks

The sprint is structured into 12 sequential tasks:

```
FIN-001 ──► FIN-002 ──► FIN-004 ──► FIN-007 ──► FIN-008
           │           │           │           │
           ├──► FIN-003┤           └──► FIN-006
           │           │           │
           └──► FIN-005 ──► FIN-009 ──► FIN-011
                         │
                         └──► FIN-010 ──► FIN-012
```

---

### Task FIN-001: Workflow Engine & State Machine Foundation

- **Task ID:** FIN-001
- **Description:** Build the core workflow state machine and data models that govern approval state transitions, routing logic, timeout escalations, and permission requirements across expense claims and purchase requests.
- **Files:**
  - `[NEW] src/lib/finance/workflow-engine.ts`
  - `[NEW] src/lib/finance/models/approval-state.ts`
  - `[NEW] src/lib/finance/models/approval-request.ts`
- **Dependencies:** None
- **Acceptance Criteria:**
  1. Correctly calculates approval stage hierarchy based on request type and monetary amount thresholds (< $500, $500–$5,000, > $5,000).
  2. Implements deterministic state transitions (`Draft` → `Submitted` → `Pending_HOD` → `Pending_Accounts` → `Pending_Principal` → `Approved` / `Rejected`).
  3. Rejects invalid transition attempts with clear descriptive errors.
  4. Unit test suite passes 100% for transition logic and state routing.
- **Verification Method:** Run `pnpm test src/lib/finance/__tests__/workflow-engine.test.ts`
- **Estimated Complexity:** Medium (1.5 days)

---

### Task FIN-002: Finance Dashboard & Queue Management Shell

- **Task ID:** FIN-002
- **Description:** Build the main Finance Dashboard component and multi-queue management view (`Pending`, `In-Progress`, `Approved`, `Rejected`), featuring quick stats counters, queue filtering, and role-scoped tabs.
- **Files:**
  - `[MODIFY] src/app/(shell)/finance/page.tsx`
  - `[NEW] src/components/finance/FinanceDashboard.tsx`
  - `[NEW] src/components/finance/ApprovalQueue.tsx`
- **Dependencies:** FIN-001
- **Acceptance Criteria:**
  1. Displays 4 distinct approval queue tabs with live item count badges.
  2. Renders summary metric cards (Pending total, Approval Rate %, Avg Processing Time).
  3. Uses `@/components/ui/` primitives (`<Skeleton>`, `<Badge>`, `<Dialog>`) and handles empty queue states gracefully.
  4. Includes explicit error catching (`.catch()`) on all fetch hooks to eliminate stuck loading states.
- **Verification Method:** Run `pnpm build` and verify component compilation cleanly.
- **Estimated Complexity:** Medium-High (2 days)

---

### Task FIN-003: Multi-Stage Expense Claims Approval Integration

- **Task ID:** FIN-003
- **Description:** Upgrade existing expense claim API handlers and logic to enforce multi-stage approval state transitions, threshold auto-routing, and immutable audit logging.
- **Files:**
  - `[MODIFY] src/app/api/expense-claims/route.ts`
  - `[MODIFY] src/app/api/expense-claims/[id]/route.ts`
  - `[NEW] src/lib/finance/__tests__/expense-approval.test.ts`
- **Dependencies:** FIN-001, FIN-002
- **Acceptance Criteria:**
  1. Expenses < $500 auto-approve upon submission.
  2. Expenses $500–$5,000 route to HOD for approval; expenses > $5,000 require HOD + Accounts + Principal approvals.
  3. Rejection requires non-empty review notes.
  4. Returns proper HTTP status codes (200, 400, 401, 403, 404).
- **Verification Method:** Run `pnpm test src/lib/finance/__tests__/expense-approval.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-004: Multi-Stage Purchase Request Approval Workflow

- **Task ID:** FIN-004
- **Description:** Extend purchase request API handlers to support multi-stage approval paths (Standard & Emergency routes) with role guards and stage progression.
- **Files:**
  - `[MODIFY] src/app/api/purchases/route.ts`
  - `[MODIFY] src/app/api/purchases/[id]/route.ts`
  - `[NEW] src/lib/finance/__tests__/purchase-approval.test.ts`
- **Dependencies:** FIN-003
- **Acceptance Criteria:**
  1. Standard route enforces Staff → Department Manager → Finance Manager → Executive approval sequence.
  2. Emergency route bypasses standard queue to route directly to HOD → Accounts with priority badge.
  3. Atomic concurrency checks (`eq(purchaseRequests.status, currentStatus)`) prevent race condition approvals.
  4. API endpoints validate required payload parameters using Zod schemas.
- **Verification Method:** Run `pnpm test src/lib/finance/__tests__/purchase-approval.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-005: Interactive Approval Decision Modal & Signature Interface

- **Task ID:** FIN-005
- **Description:** Create the core interactive `<ApprovalModal>` and decision panel components, supporting action selection (Approve, Reject, Request Info), note entry, and digital signature capture.
- **Files:**
  - `[NEW] src/components/finance/ApprovalModal.tsx`
  - `[NEW] src/components/finance/ApprovalDecisionPanel.tsx`
- **Dependencies:** FIN-002
- **Acceptance Criteria:**
  1. Modal opens with full context of target claim/request (amount, submitter, attachments, timeline).
  2. Captures mandatory rejection notes when "Reject" action is selected.
  3. Provides digital signature canvas with clear and sign controls.
  4. Disables submit button during active network requests and displays `<Skeleton>` while loading.
- **Verification Method:** Manual component render check and unit UI test execution.
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-006: Comprehensive Audit Trail Logging & History Tracking

- **Task ID:** FIN-006
- **Description:** Implement immutable audit logging tracking all approval decisions, state changes, approver IDs, timestamps, and notes, with export capabilities powered by Sprint-002's Export Engine.
- **Files:**
  - `[NEW] src/components/finance/ApprovalHistory.tsx`
  - `[NEW] src/components/finance/AuditTrailPanel.tsx`
  - `[NEW] src/lib/finance/models/audit-log.ts`
  - `[NEW] src/lib/finance/__tests__/audit-trail.test.ts`
- **Dependencies:** FIN-002, FIN-003, FIN-004
- **Acceptance Criteria:**
  1. Visual timeline lists every action with timestamp, approver name, role, and action taken.
  2. Audit log entries are strictly append-only; update/delete operations are rejected.
  3. Integrated export trigger invokes Sprint-002 `<ExportDialog>` for CSV, XLSX, and PDF export.
  4. Audit logs correctly filter by date range and institution scope.
- **Verification Method:** Run `pnpm test src/lib/finance/__tests__/audit-trail.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-007: Integration Across Shell Navigation & Finance Sub-Pages

- **Task ID:** FIN-007
- **Description:** Integrate the new approval engine across shell navigation pages, updating accounts, finance requests, and audit views to present unified queues and modal triggers.
- **Files:**
  - `[MODIFY] src/app/(shell)/accounts/page.tsx`
  - `[NEW] src/app/(shell)/finance-requests/page.tsx`
  - `[NEW] src/app/(shell)/finance-audit/page.tsx`
- **Dependencies:** FIN-002, FIN-005
- **Acceptance Criteria:**
  1. Navigating to `/finance` or `/accounts` displays current approval metrics and pending queues.
  2. Action buttons across all shell pages open the shared `<ApprovalModal>`.
  3. Responsive layout adapts seamlessly to mobile screen viewports.
  4. All fetch operations include catch handlers to prevent UI lockup.
- **Verification Method:** Run `pnpm build` and verify 0 Next.js routing compilation errors.
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-008: Core Unit Test Suite for Finance Engine & State Transitions

- **Task ID:** FIN-008
- **Description:** Build a comprehensive unit test suite covering workflow state transitions, routing rules, monetary threshold branches, and edge case recovery.
- **Files:**
  - `[NEW] src/lib/finance/__tests__/finance-workflow.test.ts`
  - `[NEW] src/lib/finance/__tests__/approval-routing.test.ts`
  - `[NEW] src/lib/finance/__tests__/audit-performance.test.ts`
- **Dependencies:** FIN-001, FIN-003, FIN-004
- **Acceptance Criteria:**
  1. Tests cover all standard, emergency, and auto-approval paths.
  2. Validates timeout escalation logic after simulated 24-hour / 72-hour periods.
  3. High coverage (>90%) across `src/lib/finance/` utility code.
  4. 100% test pass rate across all suite files.
- **Verification Method:** Run `pnpm test src/lib/finance/__tests__/`
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-009: RBAC Permission Matrix & Multi-Tenant Security Audit

- **Task ID:** FIN-009
- **Description:** Conduct security verification testing to enforce RBAC permissions (`finance:approve`, `finance:read`) and multi-tenant institution data isolation across all new endpoints.
- **Files:**
  - `[NEW] src/lib/finance/__tests__/finance-security.test.ts`
- **Dependencies:** FIN-003, FIN-004, FIN-007
- **Acceptance Criteria:**
  1. Unauthenticated API requests return `401 Unauthorized`.
  2. Users lacking `finance:approve` permission attempting approval receive `403 Forbidden`.
  3. Approvers attempting to view/approve requests from another institution receive `403 Forbidden`.
  4. DDE formula sanitization (`'`) is verified on all text notes before storage/export.
- **Verification Method:** Run `pnpm test src/lib/finance/__tests__/finance-security.test.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-010: Playwright End-to-End Approval Lifecycle Verification

- **Task ID:** FIN-010
- **Description:** Implement an E2E Playwright test suite automating the complete user flow from claim submission through multi-stage approval to final audit verification.
- **Files:**
  - `[NEW] e2e/finance-approval.spec.ts`
- **Dependencies:** FIN-007
- **Acceptance Criteria:**
  1. Automates user login, navigating to `/finance`, viewing pending claims, opening `<ApprovalModal>`, and approving.
  2. Verifies status timeline updates to "Approved" with timestamp and approver name.
  3. Tests rejection flow and verifies comment requirement enforcement.
  4. Runs deterministically without flakiness.
- **Verification Method:** Run `npx playwright test e2e/finance-approval.spec.ts`
- **Estimated Complexity:** Medium (1 day)

---

### Task FIN-011: User Documentation & AIOS Registry Synchronization

- **Task ID:** FIN-011
- **Description:** Create the comprehensive finance approval user guide and update AIOS project registries to reflect 100% completion of the Finance Module.
- **Files:**
  - `[NEW] docs/finance-approval-guide.md`
  - `[MODIFY] .ai/FEATURES.md`
  - `[MODIFY] .ai/CHANGELOG.md`
- **Dependencies:** FIN-010, FIN-009
- **Acceptance Criteria:**
  1. `docs/finance-approval-guide.md` provides clear instructions for Staff, HODs, Accounts, and Principals.
  2. `.ai/FEATURES.md` marks Finance Module as 100% Complete.
  3. `.ai/CHANGELOG.md` records v1.5.0 release changes.
- **Verification Method:** Manual documentation review.
- **Estimated Complexity:** Low (1 day)

---

### Task FIN-012: Real-time Notifications & Mobile Handoff Integration

- **Task ID:** FIN-012
- **Description:** Implement real-time WebSocket state updates, in-app notification badge counters, and mobile webview handoff integration for instant mobile approver alerts.
- **Files:**
  - `[NEW] src/lib/finance/websocket-client.ts`
  - `[NEW] src/components/finance/NotificationCenter.tsx`
  - `[NEW] src/components/finance/NotificationBadge.tsx`
- **Dependencies:** FIN-008, FIN-011
- **Acceptance Criteria:**
  1. Real-time WebSocket connection triggers instant toast alerts when new approvals enter user queue.
  2. Unread notification badge updates dynamically on header navigation.
  3. Mobile WebView handoff maintains secure auth state via `WebViewHandoffScreen` nonce exchange.
  4. Gracefully degrades to polling if WebSocket disconnects.
- **Verification Method:** Run manual WebSocket push test and browser console inspection.
- **Estimated Complexity:** Medium (1.5 days)

---

## Detailed Specifications

### API Changes

#### 1. Endpoint: `POST /api/finance/approve`
- **Description:** Process approval or advancement to next stage for an expense claim or purchase request.
- **Request Body:**
  ```json
  {
    "requestId": "req_12345",
    "requestType": "expense" | "purchase",
    "notes": "Approved after budget verification.",
    "signature": "data:image/png;base64,...",
    "nextApproverId": "staff_67890"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "requestId": "req_12345",
    "status": "pending_accounts",
    "previousStatus": "pending_hod",
    "updatedAt": "2026-08-01T10:30:00.000Z"
  }
  ```
- **Error Codes:**
  - `401 Unauthorized`: Session missing or expired.
  - `403 Forbidden`: User lacks `finance:approve` permission or institution scope mismatch.
  - `400 Bad Request`: Invalid transition state or missing required fields.
  - `404 Not Found`: Target request ID does not exist.

#### 2. Endpoint: `POST /api/finance/reject`
- **Description:** Reject an expense claim or purchase request with mandatory reason notes.
- **Request Body:**
  ```json
  {
    "requestId": "req_12345",
    "requestType": "expense" | "purchase",
    "notes": "Receipt image illegible."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "requestId": "req_12345",
    "status": "rejected",
    "updatedAt": "2026-08-01T10:32:00.000Z"
  }
  ```

#### 3. Endpoint: `GET /api/finance/queues`
- **Query Parameters:** `status=pending|approved|rejected`, `institutionId=string`, `limit=number`
- **Response (200 OK):** Array of request summary objects with submitter details and current stage.

---

## Definition of Done (DoD)

Sprint-003 will be officially declared **100% COMPLETE** when all of the following conditions are met:

1. **Task Execution:**
   - All 12 tasks (FIN-001 through FIN-012) are fully implemented and integrated.
   - Code adheres strictly to AIOS coding standards and ThaibaHive conventions.

2. **Build & Type Safety:**
   - `pnpm build` completes with **0 errors**.
   - `pnpm typecheck` (`tsc --noEmit`) passes with **0 errors**.
   - `pnpm lint` passes with **0 new warnings**.

3. **Test Suite Verification:**
   - Unit test suites pass with **100% success rate**.
   - Security verification suite (`finance-security.test.ts`) passes with 0 failures.
   - E2E Playwright test (`e2e/finance-approval.spec.ts`) passes cleanly.

4. **Multi-Tenant & Security Verification:**
   - Institution isolation verified across all API handlers.
   - DDE formula injection protection verified on all user note fields.

5. **Documentation & Handoff:**
   - `.ai/execution/Sprint-003-Execution-Log.md` recorded.
   - `.ai/FEATURES.md` updated to mark Finance Module 100% complete.
   - `.ai/CHANGELOG.md` updated with v1.5.0 release notes.
   - `docs/finance-approval-guide.md` created.
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
*Target Release Version: v1.5.0*
