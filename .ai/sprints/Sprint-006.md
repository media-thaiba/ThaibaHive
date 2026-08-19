# Implementation Contract: Sprint-006 Services Module & Campus Operations

**Sprint ID:** SIS-PARENT-006 (SRV-OPS-006)  
**Sprint Name:** Services Module & Campus Operations  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-31  
**Target Execution:** 2026-08-05 to 2026-08-12  
**Estimated Duration:** 7–9 days (50–65 hours)  
**Risk Level:** Medium  
**Classification:** AIOS v3.0 Official Implementation Contract  
**Target Release Version:** v1.8.0  

---

## Executive Summary

Sprint-006 delivers the **Services Module & Campus Operations**, fulfilling strategic priority #1 from `PROJECT_STATUS.md` ("Services Module & Campus Operations across 23+ campuses"). This sprint digitizes and unifies three core daily operational domains:
1. **Fleet Management & Transportation:** Real-time vehicle booking, automated maintenance logging, driver dispatch, and route tracking.
2. **Canteen Digital Meal Passes:** Cashless student/staff cafeteria passes, daily menu management, real-time balance validation, and parent balance monitoring.
3. **Visitor Management & Gatekeeper Security Passes:** Host approval workflows, pre-registered digital passes with cryptographically signed QR codes (HMAC-SHA256), and offline-resilient gatekeeper verification.

**Key Business Impact:**
- **40% Reduction in Fleet Operations Overhead:** Automated vehicle scheduling, driver dispatching, and maintenance tracking reduce manual administrative effort across 23+ campuses.
- **60% Faster Canteen Checkout Times:** QR meal pass scanning eliminates cash friction, reduces food waste through consumption forecasting, and enables instant parent portal balance top-ups.
- **100% Gatekeeper Digital Audit Trail:** Replaces paper visitor logbooks with pre-registration host approvals, instant QR scanning, and time-bounded visitor access logs.
- **Seamless Web-Mobile Cross-Platform Operational Continuity:** Extends the Sprint-005 mobile companion app shell for drivers, canteen cashiers, security guards, and parents.

**Strategic Alignment:**
- Advances total product completion from ~90% to ~95%.
- Extends **Sprint-001 API client & RBAC authorization mechanics** (`@thaiba/auth`).
- Leverages **Sprint-002 Export Engine** for operational audit logging (CSV/XLSX/PDF).
- Integrates with **Sprint-003 Multi-Stage Approval Engine** for host visitor approvals and vehicle requisitions.
- Reuses **Sprint-004 QR generation patterns** (`qrcode` HMAC signatures) for visitor gate passes.
- Leverages **Sprint-005 Mobile Companion Infrastructure** (Riverpod, `FlutterSecureStorage`, offline sync engine).

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation
The Sprint-006 specification is **technically sound, highly feasible, and architecturally aligned**. The foundation for campus service operations exists in partial forms within the codebase:
- Existing schema placeholders and basic routes under `src/app/api/vehicles`, `src/app/api/visitors`, and `src/app/api/canteen`.
- Dual-dialect Drizzle ORM setup (`packages/db/schema.ts` for SQLite dev and `packages/db/schema.pg.ts` for PostgreSQL prod).
- Pre-existing RBAC middleware (`requireAuth`) supporting tenant-isolated campus data queries.
- Modular web UI structure in `src/app/(shell)/vehicles`, `src/app/(shell)/canteen`, and `src/app/(shell)/visitors`.

### Technical Assessment & Risks Identified

1. **HMAC-SHA256 Signed QR Pass Security & Replay Prevention**
   - *Challenge:* Preventing visitor QR pass cloning, unauthorized access attempts, or forged security passes at campus gates.
   - *Mitigation:* Generate time-bounded (valid for specific visit window) QR payload signed with server secret key (`HMAC-SHA256`) containing `visitorId`, `hostId`, `validFrom`, `validUntil`, and `nonce`. Gate verification endpoints enforce cryptographic verification and single-entry/exit state checks.

2. **Offline Gatekeeper Verification & Network Interruption Handling**
   - *Challenge:* Campus security gates often suffer from intermittent Wi-Fi/cellular connectivity, causing verification delays.
   - *Mitigation:* Maintain a local encrypted offline cache of active visitor passes for the current day on the mobile security scanner app, syncing entry/exit timestamps to `/api/mobile/v1/visitors/sync` upon network recovery using a Last-Write-Wins (LWW) conflict resolution strategy.

3. **High-Frequency Canteen Meal Balance Double-Spending Prevention**
   - *Challenge:* Concurrent meal pass scanning across multiple canteen counters could lead to negative balance double-spending.
   - *Mitigation:* Enforce strict ACID database transaction locks (`db.transaction`) on balance deduction endpoints (`/api/canteen/redeem`), backed by atomic balance checks and idempotency keys.

4. **Multi-Tenant Campus Data Segregation**
   - *Challenge:* Ensuring fleet vehicles, canteen menus, and visitor logs from Campus A are strictly isolated from Campus B.
   - *Mitigation:* Mandate `institutionId` filter checks on all ORM queries and enforce RBAC permission scopes (`fleet:manage`, `canteen:manage`, `visitor:manage`) via `requireAuth`.

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule**, this contract was submitted to **Qwen**, **OpenCode (Local-Ollama)**, and **Claude Code** for peer review and optimization. The following enhancements were incorporated into the contract:

1. **QR Code Access Control Security (OpenCode / Ollama):** Enforced time-based cryptographically signed JWT/HMAC QR codes with pre-shared keys and valid timestamp windows to prevent gate pass forgery (`SRV-010`).
2. **Offline Gatekeeper Local Cache Resilience (OpenCode / Ollama):** Added task `SRV-011` establishing IndexedDB / Hive local caching of daily active visitor passes and append-only offline gate logs with auto-reconciliation upon reconnect.
3. **Canteen Transaction Concurrency & Double-Spend Defense (Claude Code):** Required atomic database transactions (`db.transaction`) and unique request idempotency keys on meal redemption routes (`SRV-006`, `SRV-007`) to eliminate concurrent double-deduction risks.
4. **Driver Location Verification & Server Timestamping (Qwen):** Required server-timestamped check-ins for fleet route logs (`SRV-005`) to prevent client clock manipulation during vehicle dispatch operations.
5. **Parent Portal Balance Top-up & Dietary Control Isolation (OpenCode):** Added explicit parent dietary restriction flags and transaction alert thresholds to `SRV-008` to enhance student safety and parent visibility.

---

## Scope & Out of Scope

### In Scope

1. **Database Schema & Permission Extensions:**
   - Define Drizzle ORM schemas for `fleet_vehicles`, `fleet_routes`, `fleet_maintenance_logs`, `canteen_items`, `canteen_menus`, `canteen_meal_passes`, `canteen_transactions`, `visitor_requests`, `visitor_passes`, and `gate_logs` in `packages/db/schema.ts` and `schema.pg.ts`.
   - Update RBAC permission matrix in `@thaiba/auth` for fleet, canteen, and visitor management.

2. **Fleet Management & Vehicle Operations:**
   - Web management dashboard (`/vehicles`) for fleet tracking, driver assignment, vehicle maintenance logging, and route management.
   - Vehicle booking request and approval workflow (`/api/vehicles/bookings`).
   - Mobile driver app screen (`thaibahive_mobile_app/lib/features/fleet/`) for route check-in/out and mileage logging.

3. **Canteen & Cashless Meal Pass System:**
   - Daily menu publisher and meal item price catalog (`/api/canteen/menu`).
   - Digital meal pass wallet generation, balance management, and transaction ledger (`/api/canteen/passes`).
   - Web cashier panel & mobile QR scanner screen for meal pass redemption (`/api/canteen/redeem`).
   - Parent Portal meal balance monitoring, spending limits, and dietary preference flags (`/api/mobile/v1/parent/canteen-balance`).

4. **Visitor Security & Gatekeeper Management:**
   - Visitor pre-registration and host approval request workflow (`/api/visitors/pre-register`).
   - Cryptographically signed QR pass generator (`HMAC-SHA256`) with expiry validation (`/api/visitors/pass/issue`).
   - Gatekeeper security web portal (`/visitors`) and mobile camera scanner app (`thaibahive_mobile_app/lib/features/visitors/`).
   - Offline visitor pass cache & asynchronous gate log sync (`/api/mobile/v1/visitors/sync`).

5. **Operational Exports & Security Testing:**
   - PDF/CSV/XLSX export handlers for vehicle logbooks, canteen daily reconciliation reports, and visitor audit trails.
   - Multi-tenant security unit test suite enforcing institution isolation and RBAC checks.
   - Documentation update: `docs/services-module-guide.md`, `.ai/FEATURES.md`, and `.ai/CHANGELOG.md`.

### Explicitly Out of Scope

- Hardware IoT GPS tracker protocol integrations; driver mobile app check-ins serve as primary location verification.
- Biometric facial recognition gate hardware integration; QR code scanning remains primary pass verification.
- Direct credit card payment gateway merchant setup for canteen top-ups; balance recharges route through the existing payment portal.

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Visitor QR Pass Cloning / Forgery** | High | Low | Sign QR payloads using HMAC-SHA256 with 24-hour expiration and validate host approval state on backend. |
| **Concurrent Canteen Meal Balance Double-Spending** | High | Medium | Execute balance deductions inside ACID SQL transactions (`db.transaction`) with strict balance >= amount checks. |
| **Gatekeeper Offline Sync Failure During Network Outage** | Medium | Medium | Store gate logs in local encrypted Hive/IndexedDB storage and flush queue asynchronously with exponential backoff. |
| **Multi-Tenant Campus Data Leakage** | High | Low | Enforce mandatory `where(eq(table.institutionId, user.institutionId))` filter checks on all service queries. |
| **Driver Mobile Check-in Timestamp Tampering** | Medium | Low | Enforce server-side timestamp generation on check-in APIs, ignoring client device clock inputs. |

---

## Rollback Strategy

In the event of critical failures during deployment of Sprint-006:

1. **Feature Flag Deactivation:** Set `NEXT_PUBLIC_SERVICES_MODULE_ENABLED=false` in environment config to gracefully disable fleet, canteen, and visitor routes with a standard maintenance notice.
2. **Schema Compatibility Preservation:** All schema modifications in `packages/db/schema.ts` and `schema.pg.ts` are strictly additive (new tables and optional columns). No existing core tables will be altered or dropped.
3. **API Graceful Degradation:** Service endpoints respond with HTTP 503 if disabled, preserving all core academic, examination, finance, and mobile app functions.
4. **Mobile Fallback Navigation:** Mobile companion app gracefully hides fleet driver and gatekeeper options if feature flags indicate backend service unavailability.

---

## Implementation Tasks

The sprint is broken down into **14 sequential implementation tasks**:

```
SRV-001 ──► SRV-002 ──► SRV-003 ──► SRV-004 ──► SRV-005
                         │
                         ├──► SRV-006 ──► SRV-007 ──► SRV-008
                         │
                         └──► SRV-009 ──► SRV-010 ──► SRV-011 ──► SRV-012 ──► SRV-013 ──► SRV-014
```

---

### Task SRV-001: Database Schema Extensions for Campus Service Operations

- **Task ID:** SRV-001
- **Description:** Extend Drizzle ORM schemas in both SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) to support Fleet Management (`fleet_vehicles`, `fleet_routes`, `fleet_maintenance_logs`, `vehicle_bookings`), Canteen Operations (`canteen_items`, `canteen_menus`, `canteen_meal_passes`, `canteen_transactions`), and Visitor Management (`visitor_requests`, `visitor_passes`, `gate_logs`).
- **Files:**
  - `[MODIFY] packages/db/schema.ts`
  - `[MODIFY] packages/db/schema.pg.ts`
  - `[MODIFY] packages/db/index.ts`
- **Dependencies:** None
- **Acceptance Criteria:**
  1. All 10 new database tables defined with proper column types, foreign keys, timestamps, and `institutionId` indexes.
  2. Dual-dialect parity strictly maintained between SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
  3. Package exports updated in `packages/db/index.ts` without breaking existing imports.
  4. Type generation succeeds without TypeScript or Drizzle schema errors.
- **Verification Method:** Run `pnpm --filter @thaiba/db build` and `pnpm typecheck`.
- **Estimated Complexity:** Medium (1 day)

---

### Task SRV-002: Core Validation Schemas & RBAC Permission Matrix Integration

- **Task ID:** SRV-002
- **Description:** Create Zod validation schemas in `src/lib/validation/schemas.ts` for all service request bodies and update `@thaiba/auth` RBAC definitions to include granular permission scopes (`fleet:read`, `fleet:manage`, `fleet:book`, `canteen:read`, `canteen:manage`, `canteen:redeem`, `visitor:read`, `visitor:issue`, `visitor:verify`).
- **Files:**
  - `[MODIFY] src/lib/validation/schemas.ts`
  - `[MODIFY] packages/auth/src/permissions.ts`
  - `[MODIFY] packages/auth/src/types.ts`
  - `[NEW] src/lib/__tests__/services-validation.test.ts`
- **Dependencies:** SRV-001
- **Acceptance Criteria:**
  1. Zod validation schemas defined for vehicle creation, booking, canteen menu items, meal pass top-up, visitor registration, and gate verification.
  2. `@thaiba/auth` re-exports permission constants and role mapping for `super_admin`, `admin`, `principal`, `hod`, and `staff`.
  3. Validation unit test suite passes cleanly, validating edge cases and sanitizing inputs.
- **Verification Method:** Run `pnpm test src/lib/__tests__/services-validation.test.ts`.
- **Estimated Complexity:** Medium (0.5 days)

---

### Task SRV-003: Fleet Management REST APIs & Vehicle Scheduling Engine

- **Task ID:** SRV-003
- **Description:** Implement backend API route handlers under `/api/vehicles/` for vehicle inventory management, maintenance log recording, route definitions, and booking request processing.
- **Files:**
  - `[MODIFY] src/app/api/vehicles/route.ts`
  - `[MODIFY] src/app/api/vehicles/[id]/route.ts`
  - `[NEW] src/app/api/vehicles/routes/route.ts`
  - `[NEW] src/app/api/vehicles/maintenance/route.ts`
  - `[NEW] src/app/api/vehicles/bookings/route.ts`
  - `[NEW] src/app/api/vehicles/__tests__/vehicles-api.test.ts`
- **Dependencies:** SRV-001, SRV-002
- **Acceptance Criteria:**
  1. `GET /api/vehicles` returns list of institution vehicles with status (`available`, `in_use`, `maintenance`).
  2. `POST /api/vehicles/bookings` creates booking requisition requiring admin/principal approval.
  3. `POST /api/vehicles/maintenance` logs vehicle service records and updates vehicle status automatically.
  4. All endpoints validate payloads with Zod and enforce `requireAuth` with `institutionId` filtering.
- **Verification Method:** Run `pnpm test src/app/api/vehicles/__tests__/vehicles-api.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task SRV-004: Fleet Management & Dispatch Web Dashboard UI

- **Task ID:** SRV-004
- **Description:** Develop the web dashboard shell in `src/app/(shell)/vehicles/page.tsx` providing campus administrators with vehicle tracking, driver assignments, booking request approvals, and maintenance alerts.
- **Files:**
  - `[MODIFY] src/app/(shell)/vehicles/page.tsx`
  - `[NEW] src/app/(shell)/vehicles/_components/vehicle-list.tsx`
  - `[NEW] src/app/(shell)/vehicles/_components/booking-modal.tsx`
  - `[NEW] src/app/(shell)/vehicles/_components/maintenance-tab.tsx`
  - `[NEW] src/app/(shell)/vehicles/_components/route-assignment-modal.tsx`
- **Dependencies:** SRV-003
- **Acceptance Criteria:**
  1. Renders active fleet statistics (Total Vehicles, Active Trips, Pending Bookings, Due Maintenance).
  2. Uses UI primitives (`<Button>`, `<Dialog>`, `<Badge>`, `<Skeleton>`, `<Alert>`) per `AGENTS.md` guidelines.
  3. Admin users can approve/reject vehicle booking requisitions directly from the UI.
  4. Maintenance tab displays vehicle service history and upcoming maintenance warnings.
- **Verification Method:** Run `pnpm build` and verify component render in browser.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task SRV-005: Mobile Driver Navigation & Route Check-in Screen

- **Task ID:** SRV-005
- **Description:** Build Flutter mobile UI screens and Riverpod state providers for bus drivers to view assigned routes, execute trip check-in/check-out, and record mileage.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/fleet/providers/driver_route_provider.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/fleet/screens/driver_dashboard_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/fleet/widgets/route_card.dart`
  - `[NEW] src/app/api/mobile/v1/fleet/checkin/route.ts`
- **Dependencies:** SRV-003
- **Acceptance Criteria:**
  1. Driver dashboard displays active assigned routes and trip schedule.
  2. "Start Trip" and "End Trip" actions capture server-verified timestamps and optional mileage readings.
  3. `POST /api/mobile/v1/fleet/checkin` updates vehicle trip status and broadcasts route progress updates.
  4. Follows Flutter conventions (Riverpod, `ConsumerWidget`, `cached_network_image`).
- **Verification Method:** Run `flutter analyze` inside `thaibahive_mobile_app/` and test screen rendering.
- **Estimated Complexity:** Medium (1 day)

---

### Task SRV-006: Canteen Menu Management & Meal Pass Balance API

- **Task ID:** SRV-006
- **Description:** Implement backend REST APIs under `/api/canteen/` for daily cafeteria menu publishing, meal pass creation, balance top-ups, and transaction logging.
- **Files:**
  - `[MODIFY] src/app/api/canteen/route.ts`
  - `[NEW] src/app/api/canteen/menu/route.ts`
  - `[NEW] src/app/api/canteen/passes/route.ts`
  - `[NEW] src/app/api/canteen/transactions/route.ts`
  - `[NEW] src/app/api/canteen/__tests__/canteen-api.test.ts`
- **Dependencies:** SRV-001, SRV-002
- **Acceptance Criteria:**
  1. `GET /api/canteen/menu` returns today's meal items organized by category (Breakfast, Lunch, Snacks) with availability toggles.
  2. `POST /api/canteen/passes` creates digital meal passes for students/staff with initial balance.
  3. `GET /api/canteen/transactions` returns paginated meal redemption history filtered by date range and user ID.
  4. All endpoints enforce RBAC permissions (`canteen:manage`, `canteen:read`) and tenant isolation.
- **Verification Method:** Run `pnpm test src/app/api/canteen/__tests__/canteen-api.test.ts`.
- **Estimated Complexity:** Medium (1 day)

---

### Task SRV-007: Cashless Meal Pass Redemption & Mobile QR Cashier Scanner

- **Task ID:** SRV-007
- **Description:** Develop the cashless redemption engine with atomic SQL transactions, web cashier checkout interface, and Flutter mobile scanner app for canteen staff.
- **Files:**
  - `[NEW] src/app/api/canteen/redeem/route.ts`
  - `[MODIFY] src/app/(shell)/canteen/page.tsx`
  - `[NEW] src/app/(shell)/canteen/_components/cashier-terminal.tsx`
  - `[NEW] thaibahive_mobile_app/lib/features/canteen/screens/meal_pass_scanner_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/canteen/providers/canteen_cashier_provider.dart`
- **Dependencies:** SRV-006
- **Acceptance Criteria:**
  1. `POST /api/canteen/redeem` processes balance deduction inside `db.transaction` with strict sufficiency check (balance >= total).
  2. Rejects transactions with insufficient balance, returning explicit error `{ error: "Insufficient meal pass balance" }` (HTTP 400).
  3. Web cashier terminal (`cashier-terminal.tsx`) allows instant item selection, QR code scanning, and receipt generation.
  4. `MealPassScannerScreen` in Flutter camera-scans student QR codes and executes rapid redemption (<500ms).
- **Verification Method:** Run unit tests for redemption transaction logic and verify cashier UI workflow.
- **Estimated Complexity:** High (1.5 days)

---

### Task SRV-008: Parent Portal Meal Balance Monitoring & Dietary Controls

- **Task ID:** SRV-008
- **Description:** Build Parent Portal integration for student meal pass balance tracking, transaction audit logs, dietary restriction flags, and automated low-balance alert triggers.
- **Files:**
  - `[NEW] src/app/api/mobile/v1/parent/canteen-balance/route.ts`
  - `[NEW] src/app/(shell)/parent/canteen/page.tsx`
  - `[NEW] thaibahive_mobile_app/lib/features/parent_portal/widgets/meal_balance_card.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/parent_portal/screens/dietary_settings_screen.dart`
- **Dependencies:** SRV-006, SRV-007
- **Acceptance Criteria:**
  1. Parents can view real-time student meal pass balance, recent cafeteria transactions, and daily spending graphs.
  2. Parents can set dietary restriction flags (e.g., Vegetarian, Nut Allergy, Gluten Free) that alert canteen cashiers during scan.
  3. Low balance notification triggers automatically when balance drops below configured threshold (e.g., $10 / ₹100).
  4. Integrates seamlessly with multi-child selector in Parent Portal.
- **Verification Method:** Test Parent Portal balance query API and verify Flutter widget render.
- **Estimated Complexity:** Medium (1 day)

---

### Task SRV-009: Visitor Pre-Registration & Host Approval Workflow Engine

- **Task ID:** SRV-009
- **Description:** Implement backend visitor registration, host approval routing, visit scheduling, and visitor administration web interface.
- **Files:**
  - `[MODIFY] src/app/api/visitors/route.ts`
  - `[NEW] src/app/api/visitors/pre-register/route.ts`
  - `[NEW] src/app/api/visitors/approvals/route.ts`
  - `[MODIFY] src/app/(shell)/visitors/page.tsx`
  - `[NEW] src/app/(shell)/visitors/_components/visitor-request-modal.tsx`
  - `[NEW] src/app/(shell)/visitors/_components/host-approval-table.tsx`
- **Dependencies:** SRV-001, SRV-002
- **Acceptance Criteria:**
  1. `POST /api/visitors/pre-register` creates pre-registration request with visitor details, host employee ID, visit reason, and expected time window.
  2. Host receives approval request notification; can Approve or Reject with reason note via `POST /api/visitors/approvals`.
  3. Web visitor dashboard (`/visitors`) lists active requests, host statuses, and expected daily visitor roster.
  4. Fully tenant-isolated with strict RBAC permission enforcement (`visitor:read`, `visitor:issue`).
- **Verification Method:** Execute API workflow tests for pre-registration and host approval state transitions.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task SRV-010: Cryptographic Visitor QR Pass Issuance & Gatekeeper Scanner

- **Task ID:** SRV-010
- **Description:** Build cryptographically signed visitor QR pass generator (`HMAC-SHA256`) and mobile/web gatekeeper verification tools.
- **Files:**
  - `[NEW] src/lib/visitors/qr-pass-service.ts`
  - `[NEW] src/app/api/visitors/pass/issue/route.ts`
  - `[MODIFY] src/app/api/visitors/verify/route.ts`
  - `[NEW] thaibahive_mobile_app/lib/features/visitors/screens/gate_verification_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/visitors/providers/gatekeeper_provider.dart`
  - `[NEW] src/lib/visitors/__tests__/qr-pass.test.ts`
- **Dependencies:** SRV-009
- **Acceptance Criteria:**
  1. `QrPassService` generates time-bounded HMAC-SHA256 signed QR payloads containing `visitorId`, `hostId`, `validFrom`, `validUntil`, and cryptographic signature.
  2. `POST /api/visitors/verify` validates signature authenticity and visit timestamp range, returning instant green (APPROVED) or red (DENIED) gatekeeper decision.
  3. Tampered, expired, or unapproved visitor QR codes are rejected with explicit audit reason log.
  4. `GateVerificationScreen` in Flutter camera-scans visitor pass QR codes and renders instant host contact details & gate entry button.
- **Verification Method:** Run `pnpm test src/lib/visitors/__tests__/qr-pass.test.ts` and test mobile QR gate verification.
- **Estimated Complexity:** High (1.5 days)

---

### Task SRV-011: Offline Gatekeeper Visitor Pass Cache & Asynchronous Sync Engine

- **Task ID:** SRV-011
- **Description:** Implement local encrypted offline pass caching on mobile security devices and build backend sync endpoint for offline gate entry/exit timestamp reconciliation.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/visitors/services/offline_pass_cache.dart`
  - `[NEW] src/app/api/mobile/v1/visitors/sync/route.ts`
  - `[NEW] src/app/api/mobile/v1/visitors/__tests__/visitor-sync.test.ts`
- **Dependencies:** SRV-010
- **Acceptance Criteria:**
  1. Active visitor passes for current day downloaded to encrypted Hive storage box (`offline_visitor_passes.hive`) on gatekeeper app start.
  2. Gatekeeper can verify visitor passes offline using cached HMAC public keys without active internet connection.
  3. Offline entry/exit gate logs queued locally and auto-flushed to `/api/mobile/v1/visitors/sync` upon network restoration.
  4. Backend sync unit test verifies zero record duplication and LWW timestamp reconciliation.
- **Verification Method:** Run `pnpm test src/app/api/mobile/v1/visitors/__tests__/visitor-sync.test.ts`.
- **Estimated Complexity:** Medium-High (1 day)

---

### Task SRV-012: Services Module Export Engine Integration

- **Task ID:** SRV-012
- **Description:** Extend Sprint-002 Export Engine to generate PDF, Excel (XLSX), and CSV reports for fleet logbooks, canteen daily sales reconciliation, and visitor security audit trails.
- **Files:**
  - `[NEW] src/app/api/export/fleet/route.ts`
  - `[NEW] src/app/api/export/canteen/route.ts`
  - `[NEW] src/app/api/export/visitors/route.ts`
  - `[NEW] src/lib/export/__tests__/services-export.test.ts`
- **Dependencies:** SRV-003, SRV-006, SRV-009
- **Acceptance Criteria:**
  1. Fleet export generates comprehensive vehicle mileage, maintenance cost, and trip logbook reports in CSV/XLSX/PDF.
  2. Canteen export generates itemized daily sales summary, cashier breakdown, and meal pass balance reports.
  3. Visitor export generates security audit log showing visitor names, hosts, arrival/departure timestamps, and gatekeeper IDs.
  4. All exports complete in < 2 seconds for up to 5,000 records and apply Formula Injection Sanitization per Sprint-002 guidelines.
- **Verification Method:** Run `pnpm test src/lib/export/__tests__/services-export.test.ts`.
- **Estimated Complexity:** Medium (1 day)

---

### Task SRV-013: Campus Services Multi-Tenant Security & RBAC Unit Test Suite

- **Task ID:** SRV-013
- **Description:** Author comprehensive security test suite for all campus services endpoints, verifying RBAC enforcement, tenant isolation, parameter sanitization, and unauthenticated request rejection.
- **Files:**
  - `[NEW] src/app/api/services/__tests__/services-security.test.ts`
- **Dependencies:** SRV-001 through SRV-012
- **Acceptance Criteria:**
  1. Requests without valid JWT authentication return HTTP 401 Unauthorized across all service APIs.
  2. Staff without `fleet:manage` or `canteen:manage` receive HTTP 403 Forbidden when attempting management operations.
  3. Multi-tenant checks verify user from Institution A cannot query or modify vehicles, canteen balances, or visitor passes from Institution B.
  4. SQL injection and XSS payload attempts in visitor notes or vehicle descriptions are sanitized cleanly.
- **Verification Method:** Run `pnpm test src/app/api/services/__tests__/services-security.test.ts`.
- **Estimated Complexity:** Medium (1 day)

---

### Task SRV-014: Full System Verification, User Documentation & AIOS Registry Synchronization

- **Task ID:** SRV-014
- **Description:** Conduct complete system build & test verification, author comprehensive Services Module documentation, and synchronize AIOS project status tracking files.
- **Files:**
  - `[NEW] docs/services-module-guide.md`
  - `[MODIFY] .ai/FEATURES.md`
  - `[MODIFY] .ai/CHANGELOG.md`
  - `[MODIFY] .ai/PROJECT_STATUS.md`
- **Dependencies:** SRV-001 through SRV-013
- **Acceptance Criteria:**
  1. Full automated build (`pnpm build`) and typecheck (`pnpm typecheck`) succeed with **0 errors**.
  2. `flutter analyze` inside `thaibahive_mobile_app/` completes with **0 errors and 0 strict warnings**.
  3. `docs/services-module-guide.md` created detailing Fleet, Canteen, and Visitor setup, API reference, and mobile scanner guides.
  4. `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` updated reflecting v1.8.0 release status (~95% product completion).
- **Verification Method:** Run full workspace validation script and inspect documentation formatting.
- **Estimated Complexity:** Medium (1 day)

---

## Detailed Specifications

### Database Table Schemas

#### 1. Table: `fleet_vehicles`
```typescript
export const fleetVehicles = sqliteTable("fleet_vehicles", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  registrationNumber: text("registration_number").notNull().unique(),
  model: text("model").notNull(),
  capacity: integer("capacity").notNull(),
  fuelType: text("fuel_type").notNull(), // petrol | diesel | electric
  status: text("status").notNull().default("available"), // available | in_use | maintenance
  assignedDriverId: text("assigned_driver_id").references(() => staff.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

#### 2. Table: `canteen_meal_passes`
```typescript
export const canteenMealPasses = sqliteTable("canteen_meal_passes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  userId: text("user_id").notNull(), // student or staff ID
  passCode: text("pass_code").notNull().unique(), // QR pass code
  balance: real("balance").notNull().default(0.0),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("active"), // active | suspended | blocked
  dailyLimit: real("daily_limit"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

#### 3. Table: `visitor_passes`
```typescript
export const visitorPasses = sqliteTable("visitor_passes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  visitorName: text("visitor_name").notNull(),
  visitorPhone: text("visitor_phone").notNull(),
  hostStaffId: text("host_staff_id").notNull().references(() => staff.id),
  purpose: text("purpose").notNull(),
  qrSignature: text("qr_signature").notNull(), // HMAC-SHA256 signature
  validFrom: text("valid_from").notNull(),
  validUntil: text("valid_until").notNull(),
  status: text("status").notNull().default("approved"), // pending | approved | checked_in | checked_out | expired | rejected
  checkInAt: text("check_in_at"),
  checkOutAt: text("check_out_at"),
  createdAt: text("created_at").notNull(),
});
```

---

### Key API Endpoint Specs

#### 1. Endpoint: `POST /api/canteen/redeem`
- **Description:** Deduct meal item total from digital meal pass wallet.
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Request Body:**
  ```json
  {
    "passCode": "CMP-99210-QR",
    "items": [
      { "itemId": "item_101", "quantity": 2, "unitPrice": 40.0 }
    ],
    "idempotencyKey": "idem_88319203"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "transactionId": "ctx_77192",
    "deductedAmount": 80.0,
    "remainingBalance": 420.0,
    "timestamp": "2026-08-05T12:30:00.000Z"
  }
  ```

#### 2. Endpoint: `POST /api/visitors/verify`
- **Description:** Gatekeeper security check verifying visitor QR pass.
- **Request Body:**
  ```json
  {
    "qrPayload": "VIS|inst_001|vpass_4412|1785936000|hmac_sig_abc123",
    "gatekeeperId": "staff_881"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "valid": true,
    "status": "APPROVED",
    "visitor": {
      "name": "Robert Miller",
      "phone": "+15550192",
      "hostName": "Dr. Sarah Ahmed",
      "purpose": "Academic Consultation",
      "validUntil": "2026-08-05T18:00:00.000Z"
    }
  }
  ```

---

## Definition of Done (DoD)

Sprint-006 will be officially declared **100% COMPLETE** when all of the following conditions are met:

1. **Task Execution:**
   - All 14 tasks (SRV-001 through SRV-014) are fully implemented across backend web and Flutter mobile codebase.
   - Code strictly adheres to AIOS coding standards, Next.js 16 conventions, and Flutter/Riverpod guidelines in `AGENTS.md`.

2. **Build & Type Safety:**
   - `pnpm build` completes with **0 errors**.
   - `pnpm typecheck` passes with **0 errors**.
   - `flutter analyze` inside `thaibahive_mobile_app/` passes with **0 errors and 0 strict warnings**.

3. **Test Suite Verification:**
   - Next.js backend services unit and security test suites (`vehicles-api.test.ts`, `canteen-api.test.ts`, `qr-pass.test.ts`, `services-export.test.ts`, `services-security.test.ts`) pass with **100% success rate** (target: > 65 test suites, > 400 total passing tests).
   - Flutter unit and widget tests achieve > 80% coverage across new mobile screens.

4. **Security & Data Integrity Verification:**
   - HMAC-SHA256 visitor QR pass verification verified (tampered signatures and expired timestamps strictly rejected).
   - Canteen meal pass double-deduction prevention verified under simulated concurrent load (`db.transaction`).
   - Multi-tenant institution isolation verified across all service queries.

5. **Documentation & Handoff:**
   - Execution log recorded at `.ai/execution/Sprint-006-Execution-Log.md`.
   - `.ai/FEATURES.md` updated marking Services Module & Campus Operations complete (~95% overall product completion).
   - `.ai/CHANGELOG.md` updated with v1.8.0 release notes.
   - User guide created at `docs/services-module-guide.md`.
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
*Target Release Version: v1.8.0*  
