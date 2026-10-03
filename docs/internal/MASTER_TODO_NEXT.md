# MASTER TODO NEXT — ThaibaHive Development Roadmap (Sprint-051 Reconciled)

> Executive Roadmap and Execution Backlog — audit-verified & reconciled 2026-09-27.

---

## 📊 Overview Status (Sprint-051 Audit-Corrected)

| Track | Component | Actual Status | Verified Milestones | Remaining Backlog |
|---|---|---|---|---|
| **Track A** | Core Web Platform | ✅ Complete (Phases 0-6) | 5-tier RBAC, multi-stage approvals, export engine, performance reviews, timeline UI, SafeCampus & Eco suites | Component extraction, Zustand shared UI store |
| **Track B** | Mobile Platform (Flutter) | ✅ Complete (95%) | 30 feature modules, biometrics, Riverpod, token security, mobile-web auth handoff, full offline outbox queue & server mutation appliers | Firebase production service account deployment |
| **Track C** | MediaHive | ✅ Complete (95%) | Backend API 100%, rate limiting, batch download, FFmpeg 720p fast-start transcoding, thumbnail extraction, NAS sync engine | Frontend UI fine-tuning |
| **Track D** | Enterprise & Infra | ✅ Complete | AST Gateway (578/578 routes), Tenant Isolation (1,547 files), DR Drill, Staging Smoke, 3-Browser E2E Matrix | A11y color contrast polish on select admin pages |

---

## 🎯 Phase 4: Finance & Reports (✅ COMPLETE)

### 1. Daily Reports & Hours Tracking
- [x] Task linking to daily reports — link existing tasks, auto-populate hours from task completion timestamps
- [x] Manager review/approval workflow in `src/app/api/reports/[id]/review/route.ts`
- [x] Hours summary widget on dashboard

### 2. Expense Claims — Multi-Stage Approval
- [x] In-flow receipt upload with file validation & receipt drawer (`Dialog`, `Button`, `Badge`)
- [x] Multi-tier approval chain (`pending -> pending_hod -> pending_finance -> approved -> disbursed`)
- [x] Mandatory receipt upload for claims >= Rs. 1,000
- [x] Strict anti-self-approval enforcement (`requester !== approver`)

### 3. Purchase Requests — 3-Tier Approval
- [x] Multi-tier approval machine (`pending_hod -> pending_accounts -> pending_purchase -> approved -> ordered -> received`)
- [x] Role-gated approval actions for specialized roles (`accounts`, `purchase`, `admin`, `super_admin`)
- [x] Institution budget tracking with campus allocations and remaining balance calculation
- [x] Anti-self-approval protection across all tiers

### 4. Export Engine
- [x] Production `/api/export` engine with CSV, Excel (.xlsx via ExcelJS), and PDF (via PDFKit)
- [x] Export support for attendance rosters, payroll items, expense claims, purchases, student accounts, and staff directory
- [x] Granular RBAC and institution-level data scoping

---

## 🚗 Phase 5: Services & Specialized Operations (✅ COMPLETE)

### 1. Eco & Sustainability Suite (Sprint-049)
- [x] Real-time carbon offset ledger, EV fleet charging telemetry, solar array monitoring
- [x] 100% verified via automated simulation harness (`pnpm eco:simulate`)

### 2. SafeCampus OS & Vision Shield (Sprint-050)
- [x] ALPR license plate recognition, facial verification, geofencing, real-time alert SSE stream
- [x] Automated emergency lockdown coordinator with 8-stage simulation (`pnpm vision:simulate`)

### 3. MediaHive Processing & Video Pipeline (Track C)
- [x] FFmpeg capability probe and fast-start H.264 proxy generator (`-movflags +faststart`)
- [x] Automatic poster thumbnail capture at 10%/5s offset
- [x] Video ingestion hook with metadata persistence (`durationSeconds`, `resolution`, `codec`, `frameRate`, `bitrate`)
- [x] NAS directory traversal sync engine with SHA-256 deduplication and folder tree mapping
- [x] 30/30 unit tests passing (`src/lib/media/__tests__/`)

### 4. Enterprise Operational Clusters
- [x] Academic & Student Information System (AIMS) — `pnpm aims:simulate`
- [x] Academic Foundation & Examination Engine (AFED) — `pnpm afed:simulate`
- [x] Digital Twin & Campus Simulation Mesh — `pnpm twin:simulate`
- [x] Neuro Cluster Intelligence & Advise Mesh — `pnpm neuro:simulate`, `pnpm advise:simulate`
- [x] Supply Chain Logistics & Facility Operations — `pnpm supply:simulate`, `pnpm facility:simulate`
- [x] Alumni Network & Donor Management — `pnpm alumni:simulate`

---

## 📈 Phase 6: Advanced Admin & Performance (✅ COMPLETE)

### 1. Quarterly Performance Appraisals
- [x] Database schema (`performanceReviews`) with rubric scoring and goal alignment
- [x] 4-stage evaluation workflow: `self_assessment -> manager_review -> hr_approval -> signed_off`
- [x] Strict stage-level authorization matrix with anti-forgery guards and DPoP cryptographic verification
- [x] 9 unit & authorization test suites in `src/lib/performance/__tests__/review-workflow.test.ts`

### 2. Authentication, Identity & Mobile Sync Hardening
- [x] Password reset & forgot-password flow with Resend email integration, cryptographic SHA-256 tokens (15-min TTL), rate-limiting, and enumeration prevention (10/10 tests pass)
- [x] NFC Presence Verification & Campus Settings with SQLite/PostgreSQL schema parity and upsert conflict recovery
- [x] 5-Tier RBAC Matrix & Tenant Isolation: 276/276 unique permissions mapped across all 5 tiers + specialized roles (`accounts`, `purchase`, `regional_admin`, `regional_auditor`)
- [x] Mobile offline outbox queue consolidation on `OfflineQueue` with server-side mutation appliers (`src/lib/mobile/sync-appliers.ts`) and idempotency ledger

### 3. Staff Timeline & Activity Log
- [x] Paginated, RBAC-protected audit log API at `/api/activity-logs` and `/api/admin/audit-logs`
- [x] Activity log viewer and timeline UI components

---

## 🧪 Automated Testing & Verification Matrix

| Verification Layer | Command | Result | Coverage / Notes |
|---|---|---|---|
| **Type Integrity** | `pnpm typecheck` | ✅ 0 errors | Full monorepo TypeScript compilation |
| **Lint & Style** | `pnpm lint` | ✅ 0 errors | ESLint repo-wide clean |
| **Gateway Security** | `pnpm gateway:scan` | ✅ 100% PASS | 578/578 routes shielded, 0 secret leaks |
| **Tenant Isolation** | `pnpm security:tenants` | ✅ 100% PASS | 1,547 files scanned, 0 leaks |
| **RBAC Hierarchy** | `pnpm security:rbac` | ✅ 100% PASS | 276/276 permissions mapped |
| **Disaster Recovery** | `pnpm dr:drill` | ✅ 5/5 PASS | MTTR <30s, RPO = 0 lost tx |
| **Staging Smoke** | `pnpm test:staging:smoke` | ✅ 12/12 PASS | Health, DB ping, RBAC, APM telemetry |
| **Playwright E2E Matrix** | `npx playwright test` | ✅ 100% PASS | Chromium, Firefox, WebKit cross-browser certification |
| **Media Pipeline Suite** | `jest --testPathPatterns=media` | ✅ 30/30 PASS | Transcoder, thumbnailing, NAS sync |
| **Mobile Sync Suite** | `jest --testPathPatterns=sync` | ✅ 12/12 PASS | Sync appliers, route idempotency |

---

## 🚀 Active Backlog & Next Frontiers

### Wave 1 — Production Deployment Readiness
1. **Firebase Service Account Provisioning**: Deploy production service account credentials for push notifications.

### Wave 2 — Architectural & UI Polish
2. **Component extraction**: Extract oversized page components (dashboard, reports, accounts) into dedicated sub-components.
3. **Zustand store integration**: Consolidate shared modal and filter state into centralized stores.
4. **A11y fine-tuning**: Remediate remaining color contrast and form label notices on secondary admin sub-pages.

