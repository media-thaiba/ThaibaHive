# MASTER TODO NEXT — ThaibaHive Development Roadmap (Refined)

> Executive Roadmap and Execution Backlog — audit-verified 2026-07-27.

---

## 📊 Overview Status (Audit-Corrected)

| Track | Component | Actual Status | Gap |
|-------|-----------|---------------|-----|
| **Track A** | Core Web Platform | Phases 0-3 ✅ complete. Phase 4-6 pages exist but need feature completion. | Multi-stage approvals, task linking, export engine, performance reviews, timeline UI |
| **Track B** | Mobile Platform (Flutter) | 30 feature modules, biometrics ✅, offline queue (attendance only) ✅ | FCM token registration, iOS widgets, deep link config, general offline cache |
| **Track C** | MediaHive | Backend API 80% ✅ (upload, share, folders, batch download). Frontend is mock data. | Wire UI to API, NAS sync, live transcoding |

---

## 🎯 Phase 4: Finance & Reports

### 1. Daily Reports & Hours Tracking
- [ ] Add task linking to daily reports — link existing tasks, auto-populate hours from task completion timestamps
- [ ] Implement manager review/approval workflow in `src/app/api/reports/[id]/review/route.ts` (route exists, needs logic)
- [ ] Add hours summary widget to dashboard

### 2. Expense Claims — Multi-Stage Approval
- [ ] Implement receipt upload with file validation (currently no upload in expenses page)
- [ ] Add HOD → Finance approval chain in `src/app/api/expense-claims/route.ts`
- [ ] Add approval status UI with timeline view in expenses page

### 3. Purchase Requests — 3-Tier Approval
- [ ] Implement HOD → Accounts → Purchase Manager approval flow in `src/app/api/purchases/route.ts`
- [ ] Add institution budget tracking with line items per campus
- [ ] Add budget remaining display in purchases UI

### 4. Export Engine
- [ ] Complete `src/app/api/export/route.ts` — currently stubbed
- [ ] Support CSV, Excel (xlsx), and PDF formats
- [ ] Export attendance, payroll items, expenses, and staff data

---

## 🚗 Phase 5: Services & Specialized Operations

### 1. Vehicle & Fleet Management
- [ ] Add real-time vehicle availability timeline view
- [ ] Implement driver assignment logic
- [ ] Add mileage verification for trip logs

### 2. Canteen & Meal Management
- [ ] Add daily menu planner with CRUD
- [ ] Add dietary preference submissions per staff
- [ ] Implement automated meal count notifications

### 3. Visitor Management
- [ ] Add visitor pre-registration form
- [ ] Implement QR code check-in/check-out
- [ ] Add visitor pass print view
- [ ] Build security guard dashboard

### 4. Staff Recognition
- [ ] Implement peer kudos system
- [ ] Add monthly "Employee of the Month" showcase
- [ ] Add recognition feed widget to dashboard

### 5. Grievance Redressal
- [ ] Add anonymous submission option (currently all submissions are named)
- [ ] Implement confidential committee review routing
- [ ] Add grievance status tracking

---

## 📈 Phase 6: Advanced Admin & Performance

### 1. Quarterly Performance Appraisals
- [ ] **Not started** — no schema, no routes, no UI
- [ ] Create `performanceReviews` DB table with goal setting and rubric fields
- [ ] Build admin/reviews page with quarterly evaluation workflow
- [ ] Add self-evaluation and manager review flow

### 2. Staff Timeline & Activity Log
- [ ] API exists at `src/app/api/activity-logs/route.ts` (91 lines, paginated, RBAC)
- [ ] **Build UI** — staff timeline page at `/staff/[id]/timeline` and admin log viewer
- [ ] Wire to staff profile pages

### 3. Onboarding/Offboarding Checklists
- [ ] 75% done — templates, items, assignments, task completion all working
- [ ] Add automated provisioning trigger (auto-assign checklist when staff is created)
- [ ] Add deprovisioning trigger on staff offboarding
- [ ] Add notification integration for checklist assignments

---

## 🧹 Refactoring & Technical Debt

### 1. Monolithic Component Extraction (CRITICAL)
- **9 empty component directories** need populating
- **26 page files over 200 lines** need extraction
- Worst offenders: dashboard (689L), reports (645L), accounts (632L), events (591L), purchases (580L)
- Priority: Extract dashboard, reports, expenses, purchases, events into feature components

### 2. Zustand Stores
- `zustand` v5.0.14 installed but **never imported anywhere**
- No `src/stores/` directory exists
- All state managed via `useState` — needs consolidation for shared UI state (modals, filters, sidebar)

### 3. Unified API Client Wrapper
- **Does not exist** — every page makes raw `fetch()` calls
- Need `src/lib/api/client.ts` with: automatic JWT injection, error handling, toast notifications, retry logic
- Root cause of missing `.catch()` patterns in AGENTS.md conventions

### 4. WCAG 2.1 AA Accessibility Audit
- **Partial coverage**: UI primitives (button, alert, progress) have basic ARIA
- **Missing**: focus traps in modals, skip-to-content link, ARIA landmarks, keyboard navigation, `scope` on table headers
- No audit tooling (`@axe-core/react`, Lighthouse CI) installed
- No `tabIndex` or focus management in any component

---

## 📱 Track B (Mobile) — Refinement Needed

| Feature | Status | Gap |
|---------|--------|-----|
| App structure (30 modules) | ✅ 85% | — |
| Biometric security | ✅ 90% | — |
| Offline queue (attendance) | ✅ 75% | Only attendance check-in; needs staff directory, leaves, tasks |
| FCM push | ✅ 70% | Token registration with server incomplete |
| Deep linking | ✅ 60% | No iOS config, no intent-filters in main activity |
| Home screen widgets | ✅ 25% | Android: static launcher only; iOS: none |

---

## 📺 Track C (MediaHive) — Refinement Needed

| Feature | Status | Gap |
|---------|--------|-----|
| Backend API | ✅ 80% | Production-ready (auth, rate limiting, brute-force protection) |
| DB schema | ✅ 95% | Comprehensive with indexes |
| Media library UI | ⚠️ 30% | **Mock data only** — not connected to API |
| Google Drive integration | ✅ 70% | Upload/download works, no streaming |
| Batch download (ZIP) | ✅ 75% | Rate limiting done |
| Share links | ✅ 85% | Password, expiry, brute-force protection |
| GPS metadata stripping | ✅ 90% | Works for MP4 |
| NAS sync | ❌ 0% | Not started |
| Live transcoding | ❌ 0% | Not started |

---

## 🔄 Recommended Execution Priority

### Wave 1 — Quick Wins (1-2 days)
1. **Build API client wrapper** — unblocks all other work, fixes error handling patterns
2. **Wire MediaHive UI to API** — backend is ready, just needs frontend connection
3. **Build activity log UI** — API already exists, just needs page

### Wave 2 — Core Gaps (3-5 days)
4. **Daily reports task linking** — core daily operation
5. **Expense/purchase multi-stage approvals** — core finance flow
6. **Export engine** — high-value, frequently requested

### Wave 3 — Structural (5-7 days)
7. **Component extraction** — prevents pages from becoming unmaintainable
8. **Zustand stores** — shared UI state management
9. **Performance reviews** — needs new schema + full build

### Wave 4 — Mobile & Media (ongoing)
10. **FCM token registration** fix
11. **Offline cache expansion** beyond attendance
12. **MediaHive NAS sync** and transcoding
